/**
 * Notification Model
 * In-app notifications for users
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define(
  'Notification',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    // Not an ENUM — controllers already pass 20+ distinct type strings
    // (birthday, live_session, payment_confirmed, assignment_reminder,
    // question_approved, chat_report, discord_invite, forum_reply, etc.),
    // and the ENUM only had the original 8. Every extra value was
    // silently failing on insert (Postgres rejected the enum value,
    // callers swallowed the error). Migrating to STRING(64) lets any
    // new lifecycle notification wire up without a migration. The
    // controllers act as the whitelist.
    type: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    link: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    priority: {
      type: DataTypes.ENUM('low', 'normal', 'high'),
      defaultValue: 'normal',
    },
  },
  {
    tableName: 'notifications',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['is_read'] },
      { fields: ['created_at'] },
      // Composite: hot query is "unread count for user X". Cache is
      // 60s so this only fires on cache miss, but a composite scan
      // beats intersecting two single-column indexes at scale.
      { fields: ['user_id', 'is_read'] },
    ],
  }
);

module.exports = Notification;
