const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Badge = sequelize.define('Badge', {
  id:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  slug:            { type: DataTypes.STRING(50), unique: true, allowNull: false },
  name:            { type: DataTypes.STRING(100), allowNull: false },
  description:     { type: DataTypes.TEXT },
  icon:            { type: DataTypes.STRING(100), defaultValue: '🏆' },
  condition_type:  { type: DataTypes.ENUM('course_complete','test_pass','streak','enrollment_count','score_perfect'), allowNull: false },
  condition_value: { type: DataTypes.INTEGER, defaultValue: 1 },
}, {
  tableName: 'badges',
  timestamps: true,
  updatedAt: false,
  underscored: true,
});

module.exports = Badge;
