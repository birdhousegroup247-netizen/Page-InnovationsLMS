const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AssignedTest = sequelize.define(
  'AssignedTest',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    test_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    test_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    instructor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'courses', key: 'id' },
    },
    total_questions: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    total_marks: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    time_limit_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    passing_score: {
      type: DataTypes.INTEGER,
      defaultValue: 70,
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    show_results_immediately: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    allow_retake: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    max_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    randomize_questions: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    randomize_options: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived'),
      defaultValue: 'draft',
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
    tableName: 'assigned_tests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['test_code'], unique: true },
      { fields: ['instructor_id'] },
    ],
  }
);

module.exports = AssignedTest;
