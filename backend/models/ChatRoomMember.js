/**
 * ChatRoomMember Model
 * Tracks who belongs to a course chat room and their approval status
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ChatRoomMember = sequelize.define(
  'ChatRoomMember',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    room_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'chat_rooms',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    role: {
      type: DataTypes.ENUM('instructor', 'student'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'banned'),
      defaultValue: 'pending',
    },
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    joined_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'chat_room_members',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      { fields: ['room_id'] },
      { fields: ['user_id'] },
      { fields: ['status'] },
      { unique: true, fields: ['room_id', 'user_id'] },
    ],
  }
);

module.exports = ChatRoomMember;
