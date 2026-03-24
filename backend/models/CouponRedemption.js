const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CouponRedemption = sequelize.define(
  'CouponRedemption',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    coupon_code_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'coupon_codes', key: 'id' },
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    payment_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'payments', key: 'id' },
    },
    original_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    discount_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    final_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    redeemed_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    tableName: 'coupon_redemptions',
    timestamps: false,
    indexes: [
      { fields: ['coupon_code_id'] },
      { fields: ['user_id'] },
      { fields: ['payment_id'] },
      { fields: ['coupon_code_id', 'user_id'] },
    ],
  }
);

module.exports = CouponRedemption;
