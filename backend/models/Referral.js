/**
 * Referral Model
 * Tracks who referred who and reward status
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Referral = sequelize.define(
  'Referral',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    referrer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    referred_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true, // each user can only have one referrer
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    status: {
      type: DataTypes.ENUM('pending', 'rewarded'),
      defaultValue: 'pending',
      comment: 'pending=signed up but not yet enrolled, rewarded=first enrollment complete',
    },
    rewarded_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'referrals',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Referral;
