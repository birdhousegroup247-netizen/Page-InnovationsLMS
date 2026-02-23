const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Assignment = sequelize.define('Assignment', {
  id:                    { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  course_id:             { type: DataTypes.INTEGER, allowNull: false },
  content_id:            { type: DataTypes.INTEGER, allowNull: true },
  created_by:            { type: DataTypes.INTEGER, allowNull: false },
  title:                 { type: DataTypes.STRING(255), allowNull: false },
  description:           { type: DataTypes.TEXT },
  due_date:              { type: DataTypes.DATE, allowNull: true },
  max_score:             { type: DataTypes.INTEGER, defaultValue: 100 },
  allow_file_upload:     { type: DataTypes.BOOLEAN, defaultValue: true },
  allow_text_submission: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'assignments',
  timestamps: true,
  underscored: true,
});

module.exports = Assignment;
