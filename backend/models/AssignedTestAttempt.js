const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AssignedTestAttempt = sequelize.define(
  'AssignedTestAttempt',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    assignment_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'test_assignments', key: 'id' },
    },
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    test_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'assigned_tests', key: 'id' },
    },
    attempt_number: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    total_marks: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    passed: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    time_taken_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    started_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'assigned_test_attempts',
    timestamps: false,
  }
);

module.exports = AssignedTestAttempt;
