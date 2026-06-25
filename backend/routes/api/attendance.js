const express = require('express');
const router = express.Router();
const AttendanceController = require('../../controllers/live-sessions/attendanceController');
const { authenticate } = require('../../middleware/auth/authMiddleware');

// Mounted at /api/attendance — student-facing routes that aren't
// scoped to one session URL. Per-session check-in / code generation
// / roster live on /api/sessions/:id/attendance/... (sessions.js).
router.get('/student', authenticate, AttendanceController.getStudentAttendance);

module.exports = router;
