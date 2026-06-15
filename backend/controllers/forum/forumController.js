const { ForumPost, ForumReply, User, Course, Enrollment } = require('../../models');
const ApiResponse = require('../../utils/response');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../utils/errors');
const { Op } = require('sequelize');
const NotificationsController = require('../notifications/notificationsController');
const logger = require('../../utils/logger');
const ActivityController = require('../activity/activityController');

const authorInclude = { model: User, as: 'author', attributes: ['id', 'full_name', 'profile_picture'] };

class ForumController {
  // GET /api/courses/:courseId/forum
  static async getPosts(req, res, next) {
    try {
      const { courseId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const posts = await ForumPost.findAll({
        where: { course_id: courseId },
        include: [authorInclude],
        order: [['is_pinned', 'DESC'], ['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
      });

      return ApiResponse.success(res, { posts });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/courses/:courseId/forum
  static async createPost(req, res, next) {
    try {
      const { courseId } = req.params;
      const { title, content } = req.body;

      if (!title?.trim() || !content?.trim()) {
        throw new BadRequestError('title and content are required');
      }

      const post = await ForumPost.create({
        course_id: parseInt(courseId),
        author_id: req.user.id,
        title: title.trim(),
        content: content.trim(),
      });

      const postWithAuthor = await ForumPost.findByPk(post.id, { include: [authorInclude] });
      await ActivityController.logFromRequest(req, 'forum_post', 'forum_post', post.id, {
        title: post.title, course_id: parseInt(courseId),
      }).catch(() => {});
      return ApiResponse.created(res, { post: postWithAuthor }, 'Post created');
    } catch (error) {
      next(error);
    }
  }

  // GET /api/forum/:postId
  static async getPost(req, res, next) {
    try {
      const { postId } = req.params;

      const post = await ForumPost.findByPk(postId, {
        include: [
          authorInclude,
          {
            model: ForumReply,
            as: 'replies',
            include: [authorInclude],
            separate: true,
            order: [['created_at', 'ASC']],
          },
        ],
      });

      if (!post) throw new NotFoundError('Post not found');

      return ApiResponse.success(res, { post });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/forum/:postId
  static async updatePost(req, res, next) {
    try {
      const { postId } = req.params;
      const { title, content } = req.body;

      const post = await ForumPost.findByPk(postId);
      if (!post) throw new NotFoundError('Post not found');

      const isAuthor = post.author_id === req.user.id;
      const isStaff = ['instructor', 'admin', 'super_admin'].includes(req.user.role);
      if (!isAuthor && !isStaff) throw new ForbiddenError('You can only edit your own posts');

      await post.update({
        title: title || post.title,
        content: content || post.content,
      });

      return ApiResponse.success(res, { post });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/forum/:postId
  static async deletePost(req, res, next) {
    try {
      const { postId } = req.params;

      const post = await ForumPost.findByPk(postId);
      if (!post) throw new NotFoundError('Post not found');

      const isAuthor = post.author_id === req.user.id;
      const isStaff = ['instructor', 'admin', 'super_admin'].includes(req.user.role);
      if (!isAuthor && !isStaff) throw new ForbiddenError('You can only delete your own posts');

      await post.destroy();
      return ApiResponse.success(res, null, 'Post deleted');
    } catch (error) {
      next(error);
    }
  }

  // POST /api/forum/:postId/replies
  static async addReply(req, res, next) {
    try {
      const { postId } = req.params;
      const { content } = req.body;

      if (!content?.trim()) throw new BadRequestError('content is required');

      const post = await ForumPost.findByPk(postId);
      if (!post) throw new NotFoundError('Post not found');
      if (post.is_locked) throw new ForbiddenError('This post is locked');

      const reply = await ForumReply.create({
        post_id: parseInt(postId),
        author_id: req.user.id,
        content: content.trim(),
      });

      // Increment reply count
      await post.increment('reply_count');

      const replyWithAuthor = await ForumReply.findByPk(reply.id, { include: [authorInclude] });

      // Notify post author (if different from replier)
      if (post.author_id !== req.user.id) {
        try {
          await NotificationsController.createBulkNotifications([{
            user_id: post.author_id,
            type: 'forum_reply',
            title: 'New reply on your post',
            message: `${req.user.full_name || 'Someone'} replied to "${post.title}"`,
            link: `/courses/${post.course_id}/learn`,
            priority: 'normal',
          }]);
        } catch (notifErr) {
          logger.error('Failed to send forum reply notification:', notifErr.message);
        }
      }

      await ActivityController.logFromRequest(req, 'forum_reply', 'forum_post', parseInt(postId), {
        post_title: post.title, course_id: post.course_id,
      }).catch(() => {});
      return ApiResponse.created(res, { reply: replyWithAuthor }, 'Reply added');
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/forum/replies/:replyId
  static async updateReply(req, res, next) {
    try {
      const { replyId } = req.params;
      const { content } = req.body;

      const reply = await ForumReply.findByPk(replyId);
      if (!reply) throw new NotFoundError('Reply not found');
      if (reply.author_id !== req.user.id) throw new ForbiddenError('You can only edit your own replies');

      await reply.update({ content: content || reply.content });
      return ApiResponse.success(res, { reply });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/forum/replies/:replyId
  static async deleteReply(req, res, next) {
    try {
      const { replyId } = req.params;

      const reply = await ForumReply.findByPk(replyId);
      if (!reply) throw new NotFoundError('Reply not found');

      const isAuthor = reply.author_id === req.user.id;
      const isStaff = ['instructor', 'admin', 'super_admin'].includes(req.user.role);
      if (!isAuthor && !isStaff) throw new ForbiddenError('You can only delete your own replies');

      const post = await ForumPost.findByPk(reply.post_id);
      await reply.destroy();
      if (post) await post.decrement('reply_count');

      return ApiResponse.success(res, null, 'Reply deleted');
    } catch (error) {
      next(error);
    }
  }

  // POST /api/forum/:postId/pin  (instructor/admin only)
  static async pinPost(req, res, next) {
    try {
      const { postId } = req.params;

      const post = await ForumPost.findByPk(postId);
      if (!post) throw new NotFoundError('Post not found');

      await post.update({ is_pinned: !post.is_pinned });
      return ApiResponse.success(res, { post, pinned: post.is_pinned });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/forum/:postId/upvote
  static async upvotePost(req, res, next) {
    try {
      const { postId } = req.params;

      const post = await ForumPost.findByPk(postId);
      if (!post) throw new NotFoundError('Post not found');

      await post.increment('upvote_count');
      return ApiResponse.success(res, { upvote_count: post.upvote_count + 1 });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ForumController;
