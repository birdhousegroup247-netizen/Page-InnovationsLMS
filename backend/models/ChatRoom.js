/**
 * ChatRoom Model
 * One chat room per course, auto-created when course is published
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ChatRoom = sequelize.define(
  'ChatRoom',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'courses',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: 'chat_rooms',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      { fields: ['course_id'] },
      { fields: ['is_active'] },
    ],
  }
);

module.exports = ChatRoom;
