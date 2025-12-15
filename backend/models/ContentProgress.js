const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ContentProgress = sequelize.define(
  'ContentProgress',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    content_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'module_contents', key: 'id' },
    },
    completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    watch_time_seconds: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    last_position_seconds: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_accessed: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'content_progress',
    timestamps: false,
    indexes: [
      { fields: ['student_id'] },
      { fields: ['content_id'] },
      { unique: true, fields: ['student_id', 'content_id'] },
    ],
  }
);

module.exports = ContentProgress;
