/**
 * ChatRoom Model
 * One chat room per course, auto-created when course is published
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ChatRoom = sequelize.define(
  'ChatRoom',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // Null for platform rooms (type='lounge') that aren't tied to a
    // course. Course rooms keep the one-room-per-course uniqueness
    // (Postgres unique allows multiple NULLs).
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true,
      references: {
        model: 'courses',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    // 'course' = normal per-course room; 'lounge' = the staff room every
    // instructor + admin is auto-joined to. STRING not ENUM — controllers
    // are the whitelist (see notifications-audit §3.1 for why).
    type: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'course',
    },
    // Display name for rooms without a course ("Instructors' Lounge").
    name: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    // Read-only lock. When true, only the course instructor (and
    // admins) can send messages; everyone else can still read history.
    // Toggled by the instructor from the room settings menu.
    is_read_only: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: 'chat_rooms',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      { fields: ['course_id'] },
      { fields: ['is_active'] },
    ],
  }
);

module.exports = ChatRoom;
