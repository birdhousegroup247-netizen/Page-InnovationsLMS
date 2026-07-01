/**
 * Admin email campaigns controller.
 *
 * Endpoints:
 *   GET    /api/admin/email-campaigns            list
 *   GET    /api/admin/email-campaigns/:id        detail + delivery breakdown
 *   POST   /api/admin/email-campaigns            create (draft)
 *   PUT    /api/admin/email-campaigns/:id        update (draft only)
 *   DELETE /api/admin/email-campaigns/:id        delete (draft or failed only)
 *   POST   /api/admin/email-campaigns/:id/send   flip draft -> scheduled (immediate)
 *   POST   /api/admin/email-campaigns/:id/schedule  flip draft -> scheduled (future)
 */

const { EmailCampaign, EmailDelivery, User, Course } = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { NotFoundError, BadRequestError } = require('../../utils/errors');
const ActivityController = require('../activity/activityController');

const VALID_SEGMENTS = [
  'all_students',
  'all_instructors',
  'all_users',
  'enrolled_in_course',
  'leads_not_converted',
];

class EmailCampaignsController {
  static async list(req, res, next) {
    try {
      const campaigns = await EmailCampaign.findAll({
        include: [
          { model: User, as: 'sender', attributes: ['id', 'full_name', 'email'] },
          { model: Course, as: 'segment_course', attributes: ['id', 'title'] },
        ],
        order: [['created_at', 'DESC']],
        limit: 200,
      });
      return ApiResponse.success(res, { campaigns });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const campaign = await EmailCampaign.findByPk(req.params.id, {
        include: [
          { model: User, as: 'sender', attributes: ['id', 'full_name', 'email'] },
          { model: Course, as: 'segment_course', attributes: ['id', 'title'] },
        ],
      });
      if (!campaign) throw new NotFoundError('Campaign not found');

      // Delivery breakdown (aggregate counts, not full list — the list
      // can be thousands of rows).
      const [totals, sample] = await Promise.all([
        EmailDelivery.findAll({
          where: { campaign_id: campaign.id },
          attributes: [
            'status',
            [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
          ],
          group: ['status'],
          raw: true,
        }),
        EmailDelivery.findAll({
          where: { campaign_id: campaign.id, status: 'failed' },
          limit: 20,
          attributes: ['email', 'error', 'updated_at'],
          order: [['updated_at', 'DESC']],
          raw: true,
        }),
      ]);
      return ApiResponse.success(res, {
        campaign,
        deliveries: {
          totals: totals.reduce((acc, r) => ({ ...acc, [r.status]: parseInt(r.count) }), {}),
          failure_sample: sample,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const {
        title, subject, header_title, body_html, cta_text, cta_url,
        segment, segment_course_id, scheduled_at,
      } = req.body;

      if (!title || !subject || !body_html || !segment) {
        throw new BadRequestError('title, subject, body_html and segment are required');
      }
      if (!VALID_SEGMENTS.includes(segment)) {
        throw new BadRequestError(`segment must be one of: ${VALID_SEGMENTS.join(', ')}`);
      }
      if (segment === 'enrolled_in_course' && !segment_course_id) {
        throw new BadRequestError('segment_course_id is required for enrolled_in_course segment');
      }

      const campaign = await EmailCampaign.create({
        title,
        subject,
        header_title: header_title || null,
        body_html,
        cta_text: cta_text || null,
        cta_url: cta_url || null,
        segment,
        segment_course_id: segment === 'enrolled_in_course' ? segment_course_id : null,
        scheduled_at: scheduled_at || null,
        status: 'draft',
        sender_id: req.user.id,
      });

      await ActivityController.logFromRequest(req, 'email_campaign_create', 'email_campaign', campaign.id, {
        title, segment,
      }).catch(() => {});

      return ApiResponse.created(res, { campaign }, 'Campaign created (draft)');
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const campaign = await EmailCampaign.findByPk(req.params.id);
      if (!campaign) throw new NotFoundError('Campaign not found');
      if (campaign.status !== 'draft') {
        throw new BadRequestError('Only draft campaigns can be edited');
      }
      const editable = [
        'title', 'subject', 'header_title', 'body_html', 'cta_text', 'cta_url',
        'segment', 'segment_course_id', 'scheduled_at',
      ];
      const updates = {};
      for (const k of editable) {
        if (req.body[k] !== undefined) updates[k] = req.body[k];
      }
      if (updates.segment && !VALID_SEGMENTS.includes(updates.segment)) {
        throw new BadRequestError(`segment must be one of: ${VALID_SEGMENTS.join(', ')}`);
      }
      await campaign.update(updates);
      return ApiResponse.success(res, { campaign }, 'Campaign updated');
    } catch (error) {
      next(error);
    }
  }

  static async remove(req, res, next) {
    try {
      const campaign = await EmailCampaign.findByPk(req.params.id);
      if (!campaign) throw new NotFoundError('Campaign not found');
      if (!['draft', 'failed'].includes(campaign.status)) {
        throw new BadRequestError('Only draft or failed campaigns can be deleted');
      }
      await campaign.destroy();
      return ApiResponse.success(res, null, 'Campaign deleted');
    } catch (error) {
      next(error);
    }
  }

  static async sendNow(req, res, next) {
    try {
      const campaign = await EmailCampaign.findByPk(req.params.id);
      if (!campaign) throw new NotFoundError('Campaign not found');
      if (campaign.status !== 'draft') {
        throw new BadRequestError('Only draft campaigns can be sent');
      }
      await campaign.update({ status: 'scheduled', scheduled_at: new Date() });
      logger.info(`[campaign] Admin ${req.user.email} queued campaign ${campaign.id} for immediate send`);
      await ActivityController.logFromRequest(req, 'email_campaign_send', 'email_campaign', campaign.id, {
        title: campaign.title,
      }).catch(() => {});
      return ApiResponse.success(res, { campaign }, 'Campaign queued for send — worker will pick it up shortly');
    } catch (error) {
      next(error);
    }
  }

  static async schedule(req, res, next) {
    try {
      const { scheduled_at } = req.body;
      if (!scheduled_at) throw new BadRequestError('scheduled_at is required');
      const when = new Date(scheduled_at);
      if (Number.isNaN(when.getTime())) throw new BadRequestError('Invalid scheduled_at');
      if (when.getTime() < Date.now()) {
        throw new BadRequestError('scheduled_at must be in the future');
      }
      const campaign = await EmailCampaign.findByPk(req.params.id);
      if (!campaign) throw new NotFoundError('Campaign not found');
      if (campaign.status !== 'draft') {
        throw new BadRequestError('Only draft campaigns can be scheduled');
      }
      await campaign.update({ status: 'scheduled', scheduled_at: when });
      return ApiResponse.success(res, { campaign }, 'Campaign scheduled');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = EmailCampaignsController;
