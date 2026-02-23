/**
 * Conversation Model
 * 1-to-1 direct message thread between two users
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Conversation = sequelize.define(
  'Conversation',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_a: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    user_b: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    last_message_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'conversations',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      { fields: ['user_a'] },
      { fields: ['user_b'] },
      { fields: ['last_message_at'] },
      { unique: true, fields: ['user_a', 'user_b'] },
    ],
  }
);

module.exports = Conversation;
