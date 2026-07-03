/**
 * ReviewHelpfulVote Model
 * One row per user per review — makes "Helpful" a real vote instead of
 * an unguarded counter anyone could spam-click. helpful_count on the
 * review stays as the denormalized display value.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ReviewHelpfulVote = sequelize.define(
  'ReviewHelpfulVote',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    review_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'course_reviews', key: 'id' },
      onDelete: 'CASCADE',
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
  },
  {
    tableName: 'review_helpful_votes',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      { unique: true, fields: ['review_id', 'user_id'] },
    ],
  }
);

module.exports = ReviewHelpfulVote;
