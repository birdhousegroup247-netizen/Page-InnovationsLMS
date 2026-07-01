const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Lead = sequelize.define(
  'Lead',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    full_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    experience_level: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
      allowNull: true,
    },
    referral_source: {
      type: DataTypes.ENUM('google', 'social_media', 'friend', 'youtube', 'other'),
      allowNull: true,
    },
    course_interest_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'courses', key: 'id' },
      comment: 'Which course they expressed interest in during registration',
    },
    // Tracks which drip email has been sent last
    drip_status: {
      type: DataTypes.ENUM(
        'registered',
        'welcome_sent',
        'd1_sent',
        'd3_sent',
        'd7_sent',
        'd14_sent',
        'converted',
        'unsubscribed'
      ),
      defaultValue: 'registered',
      allowNull: false,
    },
    registered_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    last_email_sent_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    converted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the lead made their first payment',
    },
    // UTM tracking for marketing attribution
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    utm_source: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    utm_medium: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    utm_campaign: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    // Consecutive send failures at the current drip_status. Reset to 0
    // when the step succeeds and the lead advances. When it hits the
    // cap (5), the lead is marked bounced and dropped from future runs.
    bounce_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    bounced_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Set by the /api/email/unsubscribe endpoint. When true, lead-drip
    // + promo emails skip this lead. Transactional flows never hit
    // leads, so no effect on those.
    email_opt_out: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: 'leads',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['email'] },
      { fields: ['drip_status'] },
      { fields: ['registered_at'] },
      { fields: ['converted_at'] },
      { fields: ['course_interest_id'] },
    ],
  }
);

module.exports = Lead;
