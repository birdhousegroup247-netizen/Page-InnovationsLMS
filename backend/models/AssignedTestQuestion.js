const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AssignedTestQuestion = sequelize.define(
  'AssignedTestQuestion',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    test_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'assigned_tests', key: 'id' },
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
    tableName: 'assigned_test_questions',
    timestamps: false,
  }
);

module.exports = AssignedTestQuestion;
