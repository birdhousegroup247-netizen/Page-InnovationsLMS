const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// One row per (session, student). The presence of a row IS the
// attendance record — no row = "unmarked", which gets auto-filled
// as 'absent' when the session transitions to 'ended'.
const LiveSessionAttendance = sequelize.define(
  'LiveSessionAttendance',
  {
    id:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    live_session_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'live_sessions', key: 'id' } },
    student_id:      { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    status:          { type: DataTypes.ENUM('present', 'late', 'absent', 'excused'), allowNull: false, defaultValue: 'present' },
    // Who filled this row in:
    //   code         — student entered a valid code
    //   instructor   — manual override from the attendance panel
    //   auto         — system auto-marked absent at session end
    source:          { type: DataTypes.ENUM('code', 'instructor', 'auto'), allowNull: false, defaultValue: 'code' },
    checked_in_at:   { type: DataTypes.DATE, allowNull: true },
    // Audit trail — never shown by default, queried only when an
    // instructor suspects cheating ("5 check-ins from one IP in
    // one minute"). Capped lengths keep noisy UAs from bloating
    // the row.
    check_in_ip:     { type: DataTypes.STRING(45), allowNull: true },
    check_in_user_agent: { type: DataTypes.STRING(500), allowNull: true },
    notes:           { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: 'live_session_attendance',
    timestamps: true,
    underscored: true,
    indexes: [
      // One row per student per session — UPSERTs happen on check-in
      // and on instructor override, so the uniqueness is enforced
      // at the DB layer too.
      { unique: true, fields: ['live_session_id', 'student_id'] },
    ],
  }
);

module.exports = LiveSessionAttendance;
