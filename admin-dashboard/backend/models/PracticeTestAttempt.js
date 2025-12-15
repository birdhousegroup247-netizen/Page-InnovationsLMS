const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PracticeTestAttempt = sequelize.define(
  'PracticeTestAttempt',
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
    question_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    time_limit_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    difficulty: {
      type: DataTypes.STRING(20),
      allowNull: true, // 'easy', 'medium', 'hard', 'mixed'
    },
    categories: {
      type: DataTypes.JSON,
      allowNull: true,
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
    time_taken_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('in_progress', 'completed', 'abandoned'),
      defaultValue: 'in_progress',
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
    tableName: 'practice_test_attempts',
    timestamps: false,
    indexes: [
      { fields: ['student_id'] },
      { fields: ['status'] },
    ],
  }
);

module.exports = PracticeTestAttempt;
