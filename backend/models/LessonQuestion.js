/**
 * Lesson Question Model
 * Students can ask questions on lesson content
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LessonQuestion = sequelize.define(
  'LessonQuestion',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    content_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'module_contents',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    question_text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    is_answered: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    upvotes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: 'lesson_questions',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['content_id'],
      },
      {
        fields: ['student_id'],
      },
    ],
  }
);

module.exports = LessonQuestion;
