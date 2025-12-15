const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AssignedTestAnswer = sequelize.define(
  'AssignedTestAnswer',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    attempt_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'assigned_test_attempts', key: 'id' },
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
  },
  {
    tableName: 'assigned_test_answers',
    timestamps: false,
  }
);

module.exports = AssignedTestAnswer;
