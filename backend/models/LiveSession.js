const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LiveSession = sequelize.define(
  'LiveSession',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'courses', key: 'id' },
    },
    instructor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    meeting_url: {
      type: DataTypes.STRING(1000),
      allowNull: true, // null until Zoom auto-generates it (or manual URL provided)
    },
    platform: {
      type: DataTypes.ENUM('zoom', 'google_meet', 'other'),
      defaultValue: 'other',
    },
    zoom_meeting_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    zoom_start_url: {
      type: DataTypes.STRING(2000), // start URLs are long
      allowNull: true,
    },
    scheduled_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 60,
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'live', 'ended'),
      defaultValue: 'scheduled',
    },
    recording_url: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'live_sessions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['course_id'] },
      { fields: ['instructor_id'] },
      { fields: ['scheduled_at'] },
    ],
  }
);

module.exports = LiveSession;
