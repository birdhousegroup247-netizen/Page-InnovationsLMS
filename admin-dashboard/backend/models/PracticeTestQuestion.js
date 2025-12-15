const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PracticeTestQuestion = sequelize.define(
  'PracticeTestQuestion',
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
    order_index: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: 'practice_test_questions',
    timestamps: false,
  }
);

module.exports = PracticeTestQuestion;
