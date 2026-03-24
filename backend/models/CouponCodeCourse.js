const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CouponCodeCourse = sequelize.define(
  'CouponCodeCourse',
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
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'courses', key: 'id' },
    },
  },
  {
    tableName: 'coupon_code_courses',
    timestamps: false,
    indexes: [
      { unique: true, fields: ['coupon_code_id', 'course_id'] },
      { fields: ['course_id'] },
    ],
  }
);

module.exports = CouponCodeCourse;
