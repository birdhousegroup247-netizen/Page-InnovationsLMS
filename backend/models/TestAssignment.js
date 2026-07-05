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
    // When a test has show_results_immediately = false, the student sees a
    // "results available later" screen until the instructor releases them.
    // Released per-assignment so the teacher can release the whole test at
    // once (bulk) or drip to individual students. Gate to view results:
    //   test.show_results_immediately || assignment.results_released
    results_released: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    results_released_at: {
      type: DataTypes.DATE,
      allowNull: true,
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
