const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Enrollment = sequelize.define(
  'Enrollment',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'courses', key: 'id' },
    },
    enrollment_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    last_accessed: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    progress_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.0,
    },
    // Cache the count of completed lessons from the last recompute.
    // The progress cron / lesson-complete handler skips the full
    // recompute when this hasn't changed since the last recompute.
    // Saves ~5 queries per lesson click for the common case where
    // the student is just adjusting playback (not completing).
    last_completed_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: 'enrollments',
    timestamps: false,
    indexes: [
      { fields: ['student_id'] },
      { fields: ['course_id'] },
      { unique: true, fields: ['student_id', 'course_id'] },
      // Performance indexes for analytics queries
      { fields: ['course_id', 'enrollment_date'] },
      { fields: ['completed_at'] },
      { fields: ['student_id', 'completed_at'] },
      { fields: ['last_accessed'] }, // For activity tracking
    ],
  }
);

module.exports = Enrollment;
