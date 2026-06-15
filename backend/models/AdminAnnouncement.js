const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AdminAnnouncement = sequelize.define(
  'AdminAnnouncement',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    admin_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    title: { type: DataTypes.STRING(255), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    // Who gets this: all_users | all_students | all_instructors | course
    target: {
      type: DataTypes.ENUM('all_users', 'all_students', 'all_instructors', 'course'),
      allowNull: false,
      defaultValue: 'all_users',
    },
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'courses', key: 'id' },
    },
    link: { type: DataTypes.STRING(500), allowNull: true },
    // Optional file attachment (Cloudinary URL). attachment_type is 'image'
    // or 'document' so the renderer picks the right preview.
    attachment_url: { type: DataTypes.STRING(500), allowNull: true },
    attachment_type: { type: DataTypes.STRING(20), allowNull: true },
    attachment_name: { type: DataTypes.STRING(255), allowNull: true },
    recipient_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  {
    tableName: 'admin_announcements',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = AdminAnnouncement;
