const express = require('express');
const router = express.Router();
const LiveSessionController = require('../../controllers/live-sessions/liveSessionController');
const AttendanceController = require('../../controllers/live-sessions/attendanceController');
const { authenticate, authorize } = require('../../middleware/auth/authMiddleware');

// Routes for /api/sessions/:id
router.put('/:id', authenticate, authorize('instructor', 'admin', 'super_admin'), LiveSessionController.update);
router.delete('/:id', authenticate, authorize('instructor', 'admin', 'super_admin'), LiveSessionController.deleteSession);
router.patch('/:id/status', authenticate, authorize('instructor', 'admin', 'super_admin'), LiveSessionController.updateStatus);

// Attendance — instructor side
router.post('/:id/attendance/code', authenticate, authorize('instructor', 'admin', 'super_admin'), AttendanceController.generateCode);
router.get('/:id/attendance/code/active', authenticate, authorize('instructor', 'admin', 'super_admin'), AttendanceController.getActiveCode);
router.get('/:id/attendance', authenticate, authorize('instructor', 'admin', 'super_admin'), AttendanceController.getRoster);
router.patch('/:id/attendance/:studentId', authenticate, authorize('instructor', 'admin', 'super_admin'), AttendanceController.setAttendance);

// Attendance — student check-in (any authenticated user; enrollment
// is verified inside the handler).
router.post('/:id/attendance/check-in', authenticate, AttendanceController.checkIn);

module.exports = router;
