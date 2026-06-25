const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AssignmentSubmission = sequelize.define('AssignmentSubmission', {
  id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  assignment_id: { type: DataTypes.INTEGER, allowNull: false },
  student_id:    { type: DataTypes.INTEGER, allowNull: false },
  text_content:  { type: DataTypes.TEXT, allowNull: true },
  file_url:      { type: DataTypes.STRING(500), allowNull: true },
  file_name:     { type: DataTypes.STRING(255), allowNull: true },
  link_url:      { type: DataTypes.STRING(500), allowNull: true },
  // True when score was filled automatically by the test-completion
  // hook (linked_test_id set on the assignment). Locks the grading
  // UI so a human can't accidentally overwrite the computed value.
  auto_graded:   { type: DataTypes.BOOLEAN, defaultValue: false },
  status:        { type: DataTypes.ENUM('submitted','graded','late'), defaultValue: 'submitted' },
  score:         { type: DataTypes.INTEGER, allowNull: true },
  feedback:      { type: DataTypes.TEXT, allowNull: true },
  submitted_at:  { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  graded_at:     { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'assignment_submissions',
  timestamps: false,
  underscored: true,
});

module.exports = AssignmentSubmission;
