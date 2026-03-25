/**
 * Admin Leads Controller
 * Read-only dashboard for lead funnel + basic management actions.
 */

const { Op } = require('sequelize');
const { Lead, User, Course } = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');

class LeadsController {
  /**
   * GET /api/admin/leads
   * List leads with pagination/filter/search.
   */
  static async getAll(req, res, next) {
    try {
      const { search, drip_status, country, page = 1, limit = 25 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const where = {};
      if (search) {
        where[Op.or] = [
          { full_name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
        ];
      }
      if (drip_status) where.drip_status = drip_status;
      if (country) where.country = country;

      const { rows: leads, count: total } = await Lead.findAndCountAll({
        where,
        include: [
          { model: Course, as: 'course_interest', attributes: ['id', 'title'], required: false },
        ],
        order: [['registered_at', 'DESC']],
        limit: parseInt(limit),
        offset,
      });

      return ApiResponse.success(res, {
        leads,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/leads/stats
   * Funnel stats by drip status + conversion rate.
   */
  static async getStats(req, res, next) {
    try {
      const statuses = ['registered', 'welcome_sent', 'd1_sent', 'd3_sent', 'd7_sent', 'd14_sent', 'converted', 'unsubscribed'];

      const counts = await Promise.all(
        statuses.map(async (s) => ({
          status: s,
          count: await Lead.count({ where: { drip_status: s } }),
        }))
      );

      const total = counts.reduce((acc, c) => acc + c.count, 0);
      const converted = counts.find((c) => c.status === 'converted')?.count || 0;
      const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : 0;

      // Last 7 days registrations
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentLeads = await Lead.count({ where: { registered_at: { [Op.gte]: sevenDaysAgo } } });

      return ApiResponse.success(res, {
        byStatus: counts,
        total,
        converted,
        conversionRate,
        recentLeads,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/leads/:id
   * Single lead detail.
   */
  static async getById(req, res, next) {
    try {
      const lead = await Lead.findByPk(req.params.id, {
        include: [{ model: Course, as: 'course_interest', attributes: ['id', 'title'], required: false }],
      });
      if (!lead) return ApiResponse.notFound(res, 'Lead not found');
      return ApiResponse.success(res, { lead });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/admin/leads/:id/convert
   * Manually mark a lead as converted (e.g. offline payment).
   */
  static async markConverted(req, res, next) {
    try {
      const lead = await Lead.findByPk(req.params.id);
      if (!lead) return ApiResponse.notFound(res, 'Lead not found');

      await lead.update({ drip_status: 'converted', converted_at: new Date() });
      logger.info(`[Leads] Admin ${req.user.id} manually converted lead ${lead.id}`);
      return ApiResponse.success(res, { lead });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/admin/leads/:id
   * Remove a lead (GDPR / cleanup).
   */
  static async delete(req, res, next) {
    try {
      const lead = await Lead.findByPk(req.params.id);
      if (!lead) return ApiResponse.notFound(res, 'Lead not found');

      await lead.destroy();
      logger.info(`[Leads] Admin ${req.user.id} deleted lead ${req.params.id}`);
      return ApiResponse.success(res, { message: 'Lead deleted' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = LeadsController;
