const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TestAssignment = sequelize.define(
  'TestAssignment',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    test_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'assigned_tests', key: 'id' },
    },
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    assigned_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'overdue'),
      defaultValue: 'pending',
    },
  },
  {
    tableName: 'test_assignments',
    timestamps: false,
    indexes: [
      { fields: ['test_id', 'student_id'], unique: true },
    ],
  }
);

module.exports = TestAssignment;
