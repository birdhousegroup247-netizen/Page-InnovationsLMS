/**
 * Cloudinary orphan cleanup.
 *
 * Runs monthly. Finds courses that have been archived for 90+ days
 * and users that have been deactivated for 90+ days, then destroys
 * the Cloudinary assets referenced from their rows (thumbnail,
 * profile_picture, module content). Leaves the DB row alone — that's
 * a separate hard-delete flow the admin can trigger explicitly.
 *
 * Rationale: soft-archived courses might come back. If we hard-delete
 * the row before 90 days, we lose it permanently. 90 days beyond the
 * archive event is a reasonable "definitely stale" threshold. Users
 * can browse an archived course's admin listing, they'll see broken
 * image previews — acceptable trade-off for the storage cost saving.
 */

const { Op } = require('sequelize');
const { Course, User, ModuleContent, CourseModule } = require('../../models');
const CloudinaryService = require('../storage/cloudinaryService');
const logger = require('../../utils/logger');

const ARCHIVE_AGE_DAYS = 90;

/**
 * Try to extract a Cloudinary public_id from a full delivery URL.
 * Cloudinary URLs look like:
 *   https://res.cloudinary.com/CLOUD/image/upload/[transforms/]v1234/pageinnovation-lms/folder/name.jpg
 *   https://res.cloudinary.com/CLOUD/raw/upload/v1234/pageinnovation-lms/folder/name.pdf
 * The public_id is everything AFTER the version segment `v\d+/`,
 * minus the file extension.
 *
 * @returns {{ publicId: string, resourceType: 'image'|'raw'|'video' } | null}
 */
function parseCloudinaryUrl(url) {
  if (typeof url !== 'string' || !url.includes('res.cloudinary.com')) return null;
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    // parts[0] = cloud name
    // parts[1] = resource_type (image | raw | video)
    // parts[2] = 'upload'
    // parts[3..] = optional transforms + v<version> + public_id path segments
    if (parts.length < 4) return null;
    const resourceType = parts[1];
    if (!['image', 'raw', 'video'].includes(resourceType)) return null;
    // Find the version segment `v<digits>` — the public_id is after it
    const versionIdx = parts.findIndex((p) => /^v\d+$/.test(p));
    if (versionIdx === -1) return null;
    const publicIdParts = parts.slice(versionIdx + 1);
    if (publicIdParts.length === 0) return null;
    // Drop file extension from the last segment
    const last = publicIdParts[publicIdParts.length - 1];
    const dot = last.lastIndexOf('.');
    if (dot > 0) publicIdParts[publicIdParts.length - 1] = last.slice(0, dot);
    return { publicId: publicIdParts.join('/'), resourceType };
  } catch (_) {
    return null;
  }
}

async function _destroyIfCloudinary(url) {
  const parsed = parseCloudinaryUrl(url);
  if (!parsed) return { skipped: 'not-cloudinary' };
  try {
    await CloudinaryService.deleteFile(parsed.publicId, parsed.resourceType);
    return { deleted: parsed.publicId };
  } catch (e) {
    // Cloudinary's destroy() returns { result: 'not found' } for
    // already-gone assets, and that path throws inside CloudinaryService
    // if unlucky. We swallow because "already deleted" is our target
    // state anyway.
    logger.warn(`[orphan-cleanup] destroy failed for ${parsed.publicId}: ${e.message}`);
    return { failed: parsed.publicId };
  }
}

async function cleanArchivedCourses() {
  const cutoff = new Date(Date.now() - ARCHIVE_AGE_DAYS * 24 * 60 * 60 * 1000);
  const courses = await Course.findAll({
    where: {
      status: 'archived',
      updated_at: { [Op.lt]: cutoff },
    },
    attributes: ['id', 'title', 'thumbnail'],
    limit: 100,
  });
  let deleted = 0;
  for (const course of courses) {
    if (course.thumbnail) {
      const res = await _destroyIfCloudinary(course.thumbnail);
      if (res.deleted) deleted++;
    }
    // Content assets on this course's lessons — video / document urls.
    const modules = await CourseModule.findAll({
      where: { course_id: course.id },
      attributes: ['id'],
    });
    if (modules.length > 0) {
      const contents = await ModuleContent.findAll({
        where: { module_id: modules.map((m) => m.id) },
        attributes: ['id', 'video_url', 'document_url'],
      });
      for (const c of contents) {
        for (const url of [c.video_url, c.document_url].filter(Boolean)) {
          const res = await _destroyIfCloudinary(url);
          if (res.deleted) deleted++;
        }
      }
    }
    logger.info(`[orphan-cleanup] Processed archived course ${course.id} ("${course.title}")`);
  }
  return { courses: courses.length, assetsDeleted: deleted };
}

async function cleanDeactivatedUsers() {
  const cutoff = new Date(Date.now() - ARCHIVE_AGE_DAYS * 24 * 60 * 60 * 1000);
  const users = await User.findAll({
    where: {
      is_active: false,
      updated_at: { [Op.lt]: cutoff },
    },
    attributes: ['id', 'email', 'profile_picture'],
    limit: 100,
  });
  let deleted = 0;
  for (const user of users) {
    if (user.profile_picture) {
      const res = await _destroyIfCloudinary(user.profile_picture);
      if (res.deleted) deleted++;
    }
    logger.info(`[orphan-cleanup] Processed deactivated user ${user.id} (${user.email})`);
  }
  return { users: users.length, assetsDeleted: deleted };
}

async function runOrphanCleanup() {
  try {
    const courseResult = await cleanArchivedCourses();
    const userResult = await cleanDeactivatedUsers();
    logger.info(
      `[orphan-cleanup] Monthly sweep: ${courseResult.courses} courses (${courseResult.assetsDeleted} assets), ${userResult.users} users (${userResult.assetsDeleted} assets)`
    );
  } catch (err) {
    logger.error(`[orphan-cleanup] crashed: ${err.message}\n${err.stack || ''}`);
  }
}

module.exports = {
  runOrphanCleanup,
  parseCloudinaryUrl,   // exported for tests / manual use
  ARCHIVE_AGE_DAYS,
};
