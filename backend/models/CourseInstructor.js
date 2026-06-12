const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * CourseInstructor — join table that lets one course have many instructors.
 *
 * courses.instructor_id stays as the LEAD instructor (so existing code paths —
 * instructor dashboard, course detail, search, instructor-reviews — keep
 * working without rewrites). This table holds the full roster including the
 * lead, so a single query against course_instructors returns everyone.
 *
 * The (course_id, user_id) pair is unique — an instructor can only hold one
 * role on a course at a time. Changing role is a re-assign, not a stack.
 */
const CourseInstructor = sequelize.define(
  'CourseInstructor',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'courses', key: 'id' },
      onDelete: 'CASCADE',
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    role: {
      type: DataTypes.ENUM('lead', 'co', 'ta'),
      allowNull: false,
      defaultValue: 'co',
      comment: 'lead = primary owner (mirrors courses.instructor_id), co = co-instructor, ta = teaching assistant',
    },
    assigned_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
      comment: 'Admin who made the assignment',
    },
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'course_instructors',
    timestamps: false,
    indexes: [
      { fields: ['course_id'] },
      { fields: ['user_id'] },
      { fields: ['course_id', 'user_id'], unique: true, name: 'course_instructors_course_user_unique' },
    ],
  }
);

module.exports = CourseInstructor;
