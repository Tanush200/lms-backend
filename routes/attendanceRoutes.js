const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const attendanceController = require('../controllers/attendanceController');

// Student self-attendance endpoints (protect only; controller validates ownership)
// IMPORTANT: define these BEFORE the parameter route /student/:studentId
router.post('/student/mark', protect, attendanceController.studentMarkToday);
router.get('/student/today', protect, attendanceController.studentToday);

router.post('/mark', protect, authorize('teacher', 'admin'), attendanceController.markBulkAttendance);
router.get('/course/:courseId', protect, attendanceController.listAttendanceForCourse);
router.get('/student/:studentId', protect, attendanceController.listAttendanceForStudent);
router.put('/:attendanceId', protect, authorize('teacher', 'admin'), attendanceController.updateAttendance);
router.get('/analytics/:courseId', protect, attendanceController.courseAttendanceAnalytics);

module.exports = router;
