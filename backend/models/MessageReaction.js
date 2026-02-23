/**
 * MessageReaction Model
 * Emoji reactions on chat messages
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MessageReaction = sequelize.define(
  'MessageReaction',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    message_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'messages', key: 'id' },
      onDelete: 'CASCADE',
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    emoji: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
  },
  {
    tableName: 'message_reactions',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      { fields: ['message_id'] },
      { fields: ['user_id'] },
      { unique: true, fields: ['message_id', 'user_id', 'emoji'] },
    ],
  }
);

module.exports = MessageReaction;
