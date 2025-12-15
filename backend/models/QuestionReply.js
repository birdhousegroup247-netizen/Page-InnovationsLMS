/**
 * Question Reply Model
 * Replies to lesson questions
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const QuestionReply = sequelize.define(
  'QuestionReply',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    question_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'lesson_questions',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    reply_text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    is_instructor: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    upvotes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: 'question_replies',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['question_id'],
      },
      {
        fields: ['user_id'],
      },
    ],
  }
);

module.exports = QuestionReply;
