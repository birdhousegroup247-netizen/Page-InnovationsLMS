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
