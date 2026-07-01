/**
 * EmailCampaign — a single admin-composed broadcast email.
 *
 * Lifecycle:
 *   draft     — being edited; not visible to worker
 *   scheduled — worker will pick up when NOW() >= scheduled_at
 *   sending   — worker started processing; batching in flight
 *   sent      — all deliveries attempted (some may have failed)
 *   failed    — hard error before any deliveries; safe to retry
 *
 * Target segments (kept simple on purpose — expand as needed):
 *   all_students          — role=student + is_active
 *   all_instructors       — role in [instructor, admin, super_admin] + is_active
 *   all_users             — every active user
 *   enrolled_in_course    — segment_course_id set; enrollees of that course
 *   leads_not_converted   — leads with converted_at IS NULL and not bounced
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EmailCampaign = sequelize.define(
  'EmailCampaign',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Admin-facing name (not shown to recipients)',
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    header_title: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Big header text at the top of the email (defaults to subject if blank)',
    },
    body_html: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'HTML for the body block. Wrapped in the standard TekyPro shell at send time.',
    },
    cta_text: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    cta_url: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    segment: {
      type: DataTypes.ENUM(
        'all_students',
        'all_instructors',
        'all_users',
        'enrolled_in_course',
        'leads_not_converted'
      ),
      allowNull: false,
    },
    segment_course_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'courses', key: 'id' },
    },
    scheduled_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Null = send now. Set = worker picks up when NOW() crosses it.',
    },
    status: {
      type: DataTypes.ENUM('draft', 'scheduled', 'sending', 'sent', 'failed'),
      allowNull: false,
      defaultValue: 'draft',
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    delivered_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    failed_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    skipped_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Recipients skipped due to email_opt_out',
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'email_campaigns',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['status'] },
      { fields: ['scheduled_at'] },
      { fields: ['sender_id'] },
    ],
  }
);

module.exports = EmailCampaign;
