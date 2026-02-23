/**
 * MutedChat Model
 * Stores per-user mute settings for a room or DM conversation.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MutedChat = sequelize.define(
  'MutedChat',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    room_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'chat_rooms', key: 'id' },
      onDelete: 'CASCADE',
    },
    conversation_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'conversations', key: 'id' },
      onDelete: 'CASCADE',
    },
  },
  {
    tableName: 'muted_chats',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { unique: true, fields: ['user_id', 'room_id'] },
      { unique: true, fields: ['user_id', 'conversation_id'] },
    ],
  }
);

module.exports = MutedChat;
