const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PracticeTestAnswer = sequelize.define(
  'PracticeTestAnswer',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    attempt_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'practice_test_attempts', key: 'id' },
    },
    question_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'question_bank', key: 'id' },
    },
    student_answer: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_correct: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    marks_awarded: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    time_taken_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: 'practice_test_answers',
    timestamps: false,
  }
);

module.exports = PracticeTestAnswer;
