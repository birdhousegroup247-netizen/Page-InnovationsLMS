const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const QuestionBank = sequelize.define(
  'QuestionBank',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    question_text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    question_type: {
      type: DataTypes.ENUM('multiple_choice', 'true_false', 'fill_blank'),
      allowNull: false,
    },
    options: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    correct_answer: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    explanation: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'courses', key: 'id' },
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'categories', key: 'id' },
    },
    subcategory: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    difficulty: {
      type: DataTypes.ENUM('easy', 'medium', 'hard'),
      defaultValue: 'medium',
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    marks: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    time_limit_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    times_used: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    times_correct: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    times_incorrect: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    average_time_seconds: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    is_approved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    approval_status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    reviewed_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    points: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'question_bank',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['course_id'] },
      { fields: ['category_id'] },
      { fields: ['difficulty'] },
      { fields: ['question_type'] },
      { fields: ['created_by'] },
    ],
  }
);

module.exports = QuestionBank;
