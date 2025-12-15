const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CourseModule = sequelize.define(
  'CourseModule',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'courses', key: 'id' },
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    order_index: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'course_modules',
    timestamps: false,
    indexes: [{ fields: ['course_id', 'order_index'] }],
  }
);

module.exports = CourseModule;
