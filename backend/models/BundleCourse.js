/**
 * BundleCourse Model
 * Join table linking bundles to courses
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BundleCourse = sequelize.define(
  'BundleCourse',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    bundle_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'bundles', key: 'id' },
      onDelete: 'CASCADE',
    },
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'courses', key: 'id' },
      onDelete: 'CASCADE',
    },
  },
  {
    tableName: 'bundle_courses',
    timestamps: false,
    underscored: true,
    indexes: [
      { unique: true, fields: ['bundle_id', 'course_id'] },
    ],
  }
);

module.exports = BundleCourse;
