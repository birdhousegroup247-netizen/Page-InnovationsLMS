/**
 * EmailDelivery — one row per (campaign, recipient) attempt.
 *
 * The worker inserts rows as it iterates the segment. `status` starts
 * `pending`, flips to `delivered`, `failed`, or `skipped` (opt-out).
 * Kept as its own table (rather than metadata on User/Lead) so future
 * "why didn't I get campaign X?" support questions are answerable
 * without a full scan.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EmailDelivery = sequelize.define(
  'EmailDelivery',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    campaign_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'email_campaigns', key: 'id' },
      onDelete: 'CASCADE',
    },
    // Either user_id or lead_id is set (based on the campaign's segment).
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    lead_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'leads', key: 'id' },
      onDelete: 'SET NULL',
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'delivered', 'failed', 'skipped'),
      allowNull: false,
      defaultValue: 'pending',
    },
    delivered_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'email_deliveries',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['campaign_id'] },
      { fields: ['user_id'] },
      { fields: ['lead_id'] },
      { fields: ['status'] },
    ],
  }
);

module.exports = EmailDelivery;
