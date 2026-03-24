const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CouponCode = sequelize.define(
  'CouponCode',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      set(value) {
        // Always store uppercase with no spaces
        this.setDataValue('code', value.toUpperCase().trim().replace(/\s+/g, ''));
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Internal admin note about this coupon',
    },
    discount_type: {
      type: DataTypes.ENUM('percentage', 'flat'),
      allowNull: false,
      comment: 'percentage = % off, flat = fixed $ amount off',
    },
    discount_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'e.g. 50 means 50% off (percentage) or $50 off (flat)',
    },
    min_purchase_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      allowNull: false,
      comment: 'Minimum course price required to use this coupon',
    },
    max_uses: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Total times this code can be used across all users. NULL = unlimited.',
    },
    uses_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    per_user_limit: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
      comment: 'How many times a single user can use this code',
    },
    applies_to: {
      type: DataTypes.ENUM('all', 'specific'),
      defaultValue: 'all',
      allowNull: false,
      comment: 'all = any course, specific = only courses listed in coupon_code_courses',
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'NULL means it never expires',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      comment: 'Admin user who created this coupon',
    },
  },
  {
    tableName: 'coupon_codes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { unique: true, fields: ['code'] },
      { fields: ['is_active'] },
      { fields: ['expires_at'] },
      { fields: ['created_by'] },
    ],
  }
);

module.exports = CouponCode;
