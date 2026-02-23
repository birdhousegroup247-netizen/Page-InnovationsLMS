const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LessonNote = sequelize.define('LessonNote', {
  id:               { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id:          { type: DataTypes.INTEGER, allowNull: false },
  content_id:       { type: DataTypes.INTEGER, allowNull: false },
  content:          { type: DataTypes.TEXT, allowNull: false },
  timestamp_seconds:{ type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'lesson_notes',
  timestamps: true,
  underscored: true,
});

module.exports = LessonNote;
