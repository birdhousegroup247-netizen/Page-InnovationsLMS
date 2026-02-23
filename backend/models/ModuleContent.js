const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ModuleContent = sequelize.define(
  'ModuleContent',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    module_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'course_modules', key: 'id' },
    },
    content_type: {
      type: DataTypes.ENUM('video', 'document', 'article'),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    youtube_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    youtube_video_id: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    document_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    document_type: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    file_size_mb: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    article_content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    order_index: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    is_preview: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    unlock_after_days: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
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
    tableName: 'module_contents',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['module_id', 'order_index'] },
      { fields: ['content_type'] },
    ],
  }
);

module.exports = ModuleContent;
