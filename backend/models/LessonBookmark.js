/**
 * Lesson Bookmark Model
 * Students can bookmark lesson content
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LessonBookmark = sequelize.define(
  'LessonBookmark',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
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
    content_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'module_contents',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    timestamp: {
      type: DataTypes.INTEGER,
      allowNull: true, // Video timestamp in seconds
      field: 'timestamp_seconds',
    },
  },
  {
    tableName: 'lesson_bookmarks',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['student_id'],
      },
      {
        fields: ['content_id'],
      },
    ],
  }
);

module.exports = LessonBookmark;
