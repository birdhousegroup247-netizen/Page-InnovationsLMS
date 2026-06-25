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
      // 'recorded_class' is for instructor-uploaded recordings of
      // a past live session (Drive / YouTube / Vimeo / Loom / direct
      // mp4). Plays via the RecordingPlayer component on the student
      // side with anti-download affordances. ENUM extended in the
      // server.js safety-net for prod since Sequelize sync doesn't
      // ALTER ENUM values on Postgres.
      type: DataTypes.ENUM('video', 'document', 'article', 'recorded_class'),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    // Set when content_type === 'recorded_class'. Accepts Drive,
    // YouTube, Vimeo, Loom or a direct video URL — the player on the
    // student side detects the provider and renders the right embed.
    recording_url: {
      type: DataTypes.STRING(500),
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
    unlock_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null,
      comment: 'Specific calendar date after which this lesson unlocks (drip scheduling)',
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
