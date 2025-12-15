const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Certificate = sequelize.define(
  'Certificate',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    certificate_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'courses', key: 'id' },
    },
    student_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    course_title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    issue_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    certificate_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'certificates',
    timestamps: false,
    indexes: [
      { fields: ['certificate_id'], unique: true },
      { fields: ['student_id'] },
      { fields: ['course_id'] },
    ],
  }
);

module.exports = Certificate;
