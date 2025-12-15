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
  },
  {
    tableName: 'enrollments',
    timestamps: false,
    indexes: [
      { fields: ['student_id'] },
      { fields: ['course_id'] },
      { unique: true, fields: ['student_id', 'course_id'] },
    ],
  }
);

module.exports = Enrollment;
