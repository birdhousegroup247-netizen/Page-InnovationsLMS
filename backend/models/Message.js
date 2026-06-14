/**
 * Message Model
 * Stores both course chat room messages and direct messages
 * room_id is set for room messages, conversation_id for DMs
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Message = sequelize.define(
  'Message',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    room_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'chat_rooms',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    conversation_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'conversations',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    reply_to_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'messages',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    attachment_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    attachment_type: {
      type: DataTypes.ENUM('image', 'document'),
      allowNull: true,
    },
    is_pinned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'messages',
    timestamps: true,
    // Explicit createdAt alias — without this Sequelize emits the JS-side
    // `createdAt` attribute on .toJSON(), and the admin UI (which reads
    // msg.created_at) renders every bubble's timestamp as "Invalid Date".
    // Same trap we hit on ActivityLog.
    createdAt: 'created_at',
    updatedAt: false,
    underscored: true,
    indexes: [
      { fields: ['room_id'] },
      { fields: ['conversation_id'] },
      { fields: ['sender_id'] },
      { fields: ['reply_to_id'] },
      { fields: ['created_at'] },
    ],
  }
);

module.exports = Message;
