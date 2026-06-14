/**
 * Activity Log Model
 * Track user activities for analytics and auditing
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ActivityLog = sequelize.define(
  'ActivityLog',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Can be null for anonymous/system activities
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
      // Examples: login, logout, course_enroll, test_complete, etc.
    },
    entity_type: {
      type: DataTypes.STRING,
      allowNull: true,
      // Examples: course, test, article, user, etc.
    },
    entity_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      // Store additional context as JSON
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'activity_logs',
    timestamps: true,
    underscored: true,
    // Explicit aliases so the JSON the API returns has snake_case keys
    // (created_at / updated_at). Without this, some Sequelize versions
    // expose them as createdAt / updatedAt on the model output, which is
    // what made the Activity Logs page render "Invalid Date" everywhere —
    // the frontend was reading log.created_at and getting undefined.
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['action'],
      },
      {
        fields: ['entity_type', 'entity_id'],
      },
      {
        fields: ['created_at'],
      },
    ],
  }
);

module.exports = ActivityLog;
