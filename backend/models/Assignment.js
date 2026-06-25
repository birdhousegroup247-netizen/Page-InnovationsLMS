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
  allow_link_submission: { type: DataTypes.BOOLEAN, defaultValue: false },
  // When set, the assignment IS a test. The student takes the linked
  // AssignedTest; the score flows back into AssignmentSubmission
  // automatically via the test-completion hook (see test attempt
  // controller). file/text/link inputs are hidden in that mode.
  linked_test_id:        { type: DataTypes.INTEGER, allowNull: true },
  // Drafts are invisible to students. New rows default to draft so
  // an instructor can prep without pinging anyone. DB-level default
  // is true so legacy rows that pre-date this column stay visible.
  is_published:          { type: DataTypes.BOOLEAN, defaultValue: true },
  // Lets a graded student update + resubmit. When true, the
  // updateSubmission endpoint clears the score and flips status
  // back to 'submitted' so the instructor knows to re-grade.
  allow_resubmit:        { type: DataTypes.BOOLEAN, defaultValue: false },
  // Due-date reminder ladder — one row per tier, stamped when the
  // cron has broadcast that tier so a re-run can't double-fire.
  reminder_24h_sent_at:  { type: DataTypes.DATE, allowNull: true },
  reminder_1h_sent_at:   { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'assignments',
  timestamps: true,
  underscored: true,
});

module.exports = Assignment;
