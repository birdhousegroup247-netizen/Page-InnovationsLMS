/**
 * Course Review Model
 * Student reviews and ratings for courses
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CourseReview = sequelize.define(
  'CourseReview',
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
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
    },
    review_text: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_approved: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    helpful_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: 'course_reviews',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['course_id'],
      },
      {
        fields: ['student_id'],
      },
      {
        unique: true,
        fields: ['course_id', 'student_id'], // One review per student per course
      },
    ],
  }
);

module.exports = CourseReview;
