const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * AnnouncementReaction
 *
 * One row per (user, announcement, emoji). Polymorphic via `source`
 * because Course and Admin announcements are separate tables — we
 * don't want a join table per kind.
 *
 *   source = 'admin'  → announcement_id refers to admin_announcements.id
 *   source = 'course' → announcement_id refers to course_announcements.id
 *
 * Composite uniqueness so a user toggling the same emoji twice is a
 * no-op insert, not a duplicate.
 */
const AnnouncementReaction = sequelize.define(
  'AnnouncementReaction',
  {
    id:      { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    source:  { type: DataTypes.ENUM('admin', 'course'), allowNull: false },
    announcement_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    emoji:   { type: DataTypes.STRING(8), allowNull: false },
  },
  {
    tableName: 'announcement_reactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['source', 'announcement_id'] },
      { fields: ['user_id'] },
      { unique: true, fields: ['source', 'announcement_id', 'user_id', 'emoji'] },
    ],
  }
);

module.exports = AnnouncementReaction;
