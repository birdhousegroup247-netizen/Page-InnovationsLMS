/**
 * Course Announcement Model
 * Instructors can post announcements to course students
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CourseAnnouncement = sequelize.define(
  'CourseAnnouncement',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'courses',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    instructor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    priority: {
      type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
      defaultValue: 'normal',
    },
    // Optional publish-at — if null, the announcement is live from the
    // moment it's created. If set in the future, students don't see it
    // until that timestamp; instructors still see it in their own list.
    scheduled_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'course_announcements',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['course_id'],
      },
      {
        fields: ['instructor_id'],
      },
    ],
  }
);

module.exports = CourseAnnouncement;
