/**
 * Attendance for live sessions.
 *
 * Model
 *   - The instructor generates a SHORT 6-digit code from the
 *     attendance panel. The code is valid for 10 minutes.
 *   - Students enter the code in their Attendance tab. We verify
 *     the code is active + the student is actually enrolled, then
 *     write a row to live_session_attendance (status='present' if
 *     within 15 min of scheduled_at, 'late' after that).
 *   - The instructor can override any student's status at any time
 *     (source='instructor').
 *   - When a session transitions to 'ended', every enrolled
 *     student without a row is auto-marked 'absent' (source='auto').
 *     The transition handler is wired in the live-session
 *     controller's updateStatus, and the hourly zombie sweep also
 *     calls the helper for safety.
 *
 * Sharing-the-code mitigation:
 *   - Enrollment check (a non-enrolled student can't check in even
 *     with a valid code).
 *   - Audit log on every check-in: check_in_ip + check_in_user_agent.
 *     Not surfaced in normal use; the instructor can query if they
 *     suspect cheating.
 */

const {
  LiveSession,
  LiveSessionAttendance,
  LiveSessionAttendanceCode,
  Enrollment,
  Course,
  User,
} = require('../../models');
const { Op } = require('sequelize');
const ApiResponse = require('../../utils/response');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../utils/errors');
const logger = require('../../utils/logger');
const NotificationsController = require('../notifications/notificationsController');

const CODE_TTL_MINUTES = 10;
const LATE_THRESHOLD_MINUTES = 15; // joining > 15 min past scheduled = 'late'

// In-memory wrong-code attempt counter. Keyed by `${userId}:${sessionId}`.
// Each entry: { attempts: number, windowStartedAt: timestamp }.
// 10 wrong tries within 5 minutes → temporarily blocked (until window
// rolls over). Successful check-in clears the entry. Process restart
// resets — that's fine: the cap is defense against brute-force, not an
// audit log.
const FAILED_ATTEMPTS = new Map();
const ATTEMPT_LIMIT = 10;
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000;
function recordFailedAttempt(userId, sessionId) {
  const key = `${userId}:${sessionId}`;
  const now = Date.now();
  const cur = FAILED_ATTEMPTS.get(key);
  if (!cur || now - cur.windowStartedAt > ATTEMPT_WINDOW_MS) {
    FAILED_ATTEMPTS.set(key, { attempts: 1, windowStartedAt: now });
    return 1;
  }
  cur.attempts += 1;
  return cur.attempts;
}
function isAttemptBlocked(userId, sessionId) {
  const cur = FAILED_ATTEMPTS.get(`${userId}:${sessionId}`);
  if (!cur) return false;
  if (Date.now() - cur.windowStartedAt > ATTEMPT_WINDOW_MS) return false;
  return cur.attempts >= ATTEMPT_LIMIT;
}
function clearFailedAttempts(userId, sessionId) {
  FAILED_ATTEMPTS.delete(`${userId}:${sessionId}`);
}

function generateCode() {
  // 6-digit zero-padded numeric. Big enough to feel random,
  // small enough to read aloud / type quickly. We don't worry
  // about cryptographic strength here — 10-min TTL and per-session
  // scope make brute force a non-issue.
  return String(Math.floor(100000 + Math.random() * 900000));
}

function _assertCanManageSession(session, user) {
  if (!session) throw new NotFoundError('Session not found');
  if (
    session.instructor_id !== user.id &&
    !['admin', 'super_admin'].includes(user.role)
  ) {
    throw new ForbiddenError('Only the session instructor or an admin can manage attendance');
  }
}

/**
 * Auto-mark every enrolled-but-unmarked student as 'absent'.
 * Idempotent — only inserts rows that don't already exist.
 * Used at session end (status → ended) AND by the zombie sweep.
 */
async function autoMarkAbsentees(session) {
  const enrollments = await Enrollment.findAll({
    where: { course_id: session.course_id },
    attributes: ['student_id'],
    raw: true,
  });
  if (enrollments.length === 0) return 0;
  const existing = await LiveSessionAttendance.findAll({
    where: { live_session_id: session.id },
    attributes: ['student_id'],
    raw: true,
  });
  const markedIds = new Set(existing.map((r) => r.student_id));
  const unmarked = enrollments
    .map((e) => e.student_id)
    .filter((id) => !markedIds.has(id));
  if (unmarked.length === 0) return 0;
  await LiveSessionAttendance.bulkCreate(
    unmarked.map((studentId) => ({
      live_session_id: session.id,
      student_id: studentId,
      status: 'absent',
      source: 'auto',
    }))
  );
  return unmarked.length;
}

class AttendanceController {
  /**
   * POST /api/live-sessions/:id/attendance/code
   * Instructor: generate a fresh attendance code (10-min TTL).
   *
   * Side effects:
   *   1. Any prior unexpired codes for this session are explicitly
   *      expired (expires_at = now). Prevents the case where an
   *      instructor hits Generate twice and the old code is still
   *      valid for up to 10 min.
   *   2. Enrolled students get a high-priority in-app notification
   *      so they know a window is open. Fire-and-forget — a notify
   *      failure can't block code generation.
   */
  static async generateCode(req, res, next) {
    try {
      const { id } = req.params;
      const session = await LiveSession.findByPk(id, {
        include: [{ model: Course, as: 'course', attributes: ['id', 'title'] }],
      });
      _assertCanManageSession(session, req.user);

      const now = new Date();

      // Invalidate any code that is still live for this session.
      await LiveSessionAttendanceCode.update(
        { expires_at: now },
        {
          where: {
            live_session_id: session.id,
            expires_at: { [Op.gt]: now },
          },
        }
      );

      const expiresAt = new Date(now.getTime() + CODE_TTL_MINUTES * 60 * 1000);
      const created = await LiveSessionAttendanceCode.create({
        live_session_id: session.id,
        code: generateCode(),
        expires_at: expiresAt,
        created_by: req.user.id,
      });

      // Displaying an attendance code means class has started. Without
      // this, instructors who never clicked the separate "go live" action
      // left the session 'scheduled' — and the student page only shows
      // the check-in button on 'live' sessions, so nobody could enter
      // the code they were staring at.
      if (session.status === 'scheduled') {
        await session.update({ status: 'live' });
        logger.info(`[attendance] session ${session.id} auto-flipped to live on code generation`);
      }

      // Notify enrolled students that a check-in window is open.
      // The notification deliberately does NOT contain the code —
      // students must read it from the instructor's shared screen.
      (async () => {
        try {
          const enrollments = await Enrollment.findAll({
            where: { course_id: session.course_id },
            attributes: ['student_id'],
            raw: true,
          });
          if (enrollments.length === 0) return;
          const courseLabel = session.course?.title ? ` (${session.course.title})` : '';
          const notifications = enrollments.map((e) => ({
            user_id: e.student_id,
            type: 'attendance_code',
            title: 'Attendance code active',
            message: `Check in for "${session.title}"${courseLabel} — the code your instructor showed is valid for 10 minutes.`,
            link: '/attendance',
            priority: 'high',
          }));
          await NotificationsController.createBulkNotifications(notifications);
        } catch (notifErr) {
          logger.warn(`[attendance-code-notify] failed for session ${session.id}: ${notifErr.message}`);
        }
      })();

      return ApiResponse.success(res, {
        code: created.code,
        expires_at: created.expires_at,
        ttl_seconds: CODE_TTL_MINUTES * 60,
      }, 'Code generated');
    } catch (err) { next(err); }
  }

  /**
   * GET /api/live-sessions/:id/attendance/code/active
   * Instructor: peek at the currently active code (so a panel refresh
   * doesn't strand the instructor without a way to re-read what's
   * already on screen).
   */
  static async getActiveCode(req, res, next) {
    try {
      const { id } = req.params;
      const session = await LiveSession.findByPk(id);
      _assertCanManageSession(session, req.user);

      const now = new Date();
      const code = await LiveSessionAttendanceCode.findOne({
        where: { live_session_id: id, expires_at: { [Op.gt]: now } },
        order: [['created_at', 'DESC']],
      });
      if (!code) return ApiResponse.success(res, { code: null });
      return ApiResponse.success(res, {
        code: code.code,
        expires_at: code.expires_at,
      });
    } catch (err) { next(err); }
  }

  /**
   * POST /api/live-sessions/:id/attendance/check-in
   * Student: body { code }. Validates the code, enrollment, then
   * writes a present/late row. Idempotent — a duplicate check-in
   * returns the existing row instead of erroring.
   */
  static async checkIn(req, res, next) {
    try {
      const { id } = req.params;
      const { code } = req.body || {};
      if (!code || typeof code !== 'string') {
        throw new BadRequestError('Attendance code is required');
      }

      const session = await LiveSession.findByPk(id);
      if (!session) throw new NotFoundError('Session not found');

      // Enrollment check — instructors can't self-check-in for their
      // own session via this endpoint either.
      const enrollment = await Enrollment.findOne({
        where: { student_id: req.user.id, course_id: session.course_id },
      });
      if (!enrollment) throw new ForbiddenError('You are not enrolled in this course');

      // Brute-force guard: 10 wrong tries in 5 min temporarily blocks
      // further attempts. Window is per-user-per-session.
      if (isAttemptBlocked(req.user.id, id)) {
        throw new BadRequestError('Too many incorrect attempts. Try again in a few minutes.');
      }

      // Code must exist + not be expired + belong to this session.
      const now = new Date();
      const codeRow = await LiveSessionAttendanceCode.findOne({
        where: {
          live_session_id: id,
          code: code.trim(),
          expires_at: { [Op.gt]: now },
        },
        order: [['created_at', 'DESC']],
      });
      if (!codeRow) {
        const attempts = recordFailedAttempt(req.user.id, id);
        const remaining = Math.max(0, ATTEMPT_LIMIT - attempts);
        const suffix = remaining > 0 && remaining <= 3 ? ` (${remaining} attempt${remaining === 1 ? '' : 's'} left)` : '';
        throw new BadRequestError(`Code is invalid or has expired.${suffix}`);
      }
      // Valid code → wipe the counter so an honest student's earlier
      // typos don't haunt them.
      clearFailedAttempts(req.user.id, id);

      // Late if joined > 15 min after scheduled start.
      const scheduledTs = new Date(session.scheduled_at).getTime();
      const lateCutoff = scheduledTs + LATE_THRESHOLD_MINUTES * 60 * 1000;
      const status = now.getTime() > lateCutoff ? 'late' : 'present';

      // Audit info — trimmed to schema limits.
      const ip = (req.ip || req.headers['x-forwarded-for'] || '').slice(0, 45);
      const ua = (req.headers['user-agent'] || '').slice(0, 500);

      // Upsert so a re-click doesn't fail. If a row already exists
      // we update the timestamp + source only when going from
      // absent → present (instructor may have pre-marked them).
      const [row, created] = await LiveSessionAttendance.findOrCreate({
        where: { live_session_id: id, student_id: req.user.id },
        defaults: {
          live_session_id: id,
          student_id: req.user.id,
          status,
          source: 'code',
          checked_in_at: now,
          check_in_ip: ip,
          check_in_user_agent: ua,
        },
      });
      if (!created) {
        // If the instructor had pre-marked them absent, a valid
        // code check-in overrides it. Otherwise just leave alone
        // (idempotent re-click).
        if (row.status === 'absent') {
          await row.update({
            status,
            source: 'code',
            checked_in_at: now,
            check_in_ip: ip,
            check_in_user_agent: ua,
          });
        }
      }

      return ApiResponse.success(res, {
        attendance: {
          status: row.status,
          checked_in_at: row.checked_in_at,
        },
      }, 'Checked in');
    } catch (err) { next(err); }
  }

  /**
   * GET /api/live-sessions/:id/attendance
   * Instructor: the full roster + each student's attendance row
   * (null for unmarked). Includes stat totals.
   */
  static async getRoster(req, res, next) {
    try {
      const { id } = req.params;
      const session = await LiveSession.findByPk(id, {
        include: [{ model: Course, as: 'course', attributes: ['id', 'title'] }],
      });
      _assertCanManageSession(session, req.user);

      const enrollments = await Enrollment.findAll({
        where: { course_id: session.course_id },
        include: [{ model: User, as: 'student', attributes: ['id', 'full_name', 'email', 'profile_picture'] }],
      });
      const records = await LiveSessionAttendance.findAll({
        where: { live_session_id: id },
      });
      const byStudent = new Map(records.map((r) => [r.student_id, r]));

      const roster = enrollments.map((e) => {
        const r = byStudent.get(e.student_id);
        return {
          student: e.student
            ? { id: e.student.id, full_name: e.student.full_name, email: e.student.email, profile_picture: e.student.profile_picture }
            : { id: e.student_id, full_name: null, email: null, profile_picture: null },
          attendance: r ? {
            id: r.id,
            status: r.status,
            source: r.source,
            checked_in_at: r.checked_in_at,
            notes: r.notes,
          } : null,
        };
      });

      const totals = {
        enrolled: roster.length,
        present: roster.filter((r) => r.attendance?.status === 'present').length,
        late:    roster.filter((r) => r.attendance?.status === 'late').length,
        absent:  roster.filter((r) => r.attendance?.status === 'absent').length,
        excused: roster.filter((r) => r.attendance?.status === 'excused').length,
        unmarked: roster.filter((r) => !r.attendance).length,
      };

      return ApiResponse.success(res, { session, totals, roster });
    } catch (err) { next(err); }
  }

  /**
   * PATCH /api/live-sessions/:id/attendance/:studentId
   * Instructor: manual override of a single student's row.
   * Body: { status: 'present'|'late'|'absent'|'excused', notes? }
   */
  static async setAttendance(req, res, next) {
    try {
      const { id, studentId } = req.params;
      const { status, notes } = req.body || {};
      if (!['present', 'late', 'absent', 'excused'].includes(status)) {
        throw new BadRequestError('status must be present, late, absent or excused');
      }
      const session = await LiveSession.findByPk(id);
      _assertCanManageSession(session, req.user);

      // Sanity: that student must be enrolled in this course.
      const enrolled = await Enrollment.findOne({
        where: { student_id: studentId, course_id: session.course_id },
      });
      if (!enrolled) throw new BadRequestError('Student is not enrolled in this course');

      const [row] = await LiveSessionAttendance.findOrCreate({
        where: { live_session_id: id, student_id: studentId },
        defaults: {
          live_session_id: id,
          student_id: studentId,
          status,
          source: 'instructor',
          checked_in_at: status === 'present' || status === 'late' ? new Date() : null,
          notes: notes || null,
        },
      });
      await row.update({
        status,
        source: 'instructor',
        notes: notes !== undefined ? notes : row.notes,
        checked_in_at: (status === 'present' || status === 'late') && !row.checked_in_at ? new Date() : row.checked_in_at,
      });
      return ApiResponse.success(res, { attendance: row }, 'Attendance updated');
    } catch (err) { next(err); }
  }

  /**
   * POST /api/sessions/:id/attendance/bulk
   * Body: { status, scope }
   *   status — present | late | absent | excused
   *   scope  — 'unmarked' (default; only fills in students with no row)
   *          | 'all'      (overrides every enrolled student)
   *
   * Cuts the common "mark everyone absent" / "mark everyone present"
   * grunt work that the per-row dropdown would otherwise force.
   */
  static async bulkSet(req, res, next) {
    try {
      const { id } = req.params;
      const { status, scope = 'unmarked' } = req.body || {};
      if (!['present', 'late', 'absent', 'excused'].includes(status)) {
        throw new BadRequestError('status must be present, late, absent or excused');
      }
      if (!['unmarked', 'all'].includes(scope)) {
        throw new BadRequestError('scope must be "unmarked" or "all"');
      }
      const session = await LiveSession.findByPk(id);
      _assertCanManageSession(session, req.user);

      const enrollments = await Enrollment.findAll({
        where: { course_id: session.course_id },
        attributes: ['student_id'],
        raw: true,
      });
      if (enrollments.length === 0) {
        return ApiResponse.success(res, { updated: 0 });
      }

      const existing = await LiveSessionAttendance.findAll({
        where: { live_session_id: id },
        attributes: ['student_id'],
        raw: true,
      });
      const markedIds = new Set(existing.map((r) => r.student_id));

      const now = new Date();
      const checkedAt = (status === 'present' || status === 'late') ? now : null;

      let updated = 0;
      const targetIds = scope === 'unmarked'
        ? enrollments.map((e) => e.student_id).filter((id) => !markedIds.has(id))
        : enrollments.map((e) => e.student_id);

      if (targetIds.length === 0) {
        return ApiResponse.success(res, { updated: 0 });
      }

      // Two paths: insert new rows for students without one, update
      // existing rows otherwise.
      const toInsert = targetIds.filter((sid) => !markedIds.has(sid));
      const toUpdate = targetIds.filter((sid) => markedIds.has(sid));

      if (toInsert.length > 0) {
        await LiveSessionAttendance.bulkCreate(
          toInsert.map((sid) => ({
            live_session_id: id,
            student_id: sid,
            status,
            source: 'instructor',
            checked_in_at: checkedAt,
          }))
        );
        updated += toInsert.length;
      }
      if (toUpdate.length > 0) {
        const [count] = await LiveSessionAttendance.update(
          {
            status,
            source: 'instructor',
            checked_in_at: checkedAt,
          },
          {
            where: {
              live_session_id: id,
              student_id: { [Op.in]: toUpdate },
            },
          }
        );
        updated += count;
      }

      return ApiResponse.success(res, { updated }, 'Bulk attendance updated');
    } catch (err) { next(err); }
  }

  /**
   * GET /api/student/attendance
   * Student: every session across enrolled courses, with the
   * student's status (or null = upcoming/unmarked).
   */
  static async getStudentAttendance(req, res, next) {
    try {
      const enrollments = await Enrollment.findAll({
        where: { student_id: req.user.id },
        attributes: ['course_id'],
        raw: true,
      });
      const courseIds = enrollments.map((e) => e.course_id);
      if (courseIds.length === 0) {
        return ApiResponse.success(res, { sessions: [] });
      }
      const sessions = await LiveSession.findAll({
        where: { course_id: { [Op.in]: courseIds } },
        include: [
          { model: Course, as: 'course', attributes: ['id', 'title'] },
        ],
        order: [['scheduled_at', 'DESC']],
        limit: 100,
      });
      const records = await LiveSessionAttendance.findAll({
        where: {
          live_session_id: { [Op.in]: sessions.map((s) => s.id) },
          student_id: req.user.id,
        },
      });
      const byId = new Map(records.map((r) => [r.live_session_id, r]));
      const enriched = sessions.map((s) => ({
        id: s.id,
        title: s.title,
        scheduled_at: s.scheduled_at,
        duration_minutes: s.duration_minutes,
        status: s.status,
        course: s.course ? { id: s.course.id, title: s.course.title } : null,
        attendance: byId.get(s.id)
          ? {
              status: byId.get(s.id).status,
              source: byId.get(s.id).source,
              checked_in_at: byId.get(s.id).checked_in_at,
            }
          : null,
      }));
      return ApiResponse.success(res, { sessions: enriched });
    } catch (err) { next(err); }
  }
}

module.exports = AttendanceController;
module.exports.autoMarkAbsentees = autoMarkAbsentees;
