const express = require('express');
const router  = express.Router();
const {
  getToday, getHistory, getSummary, checkIn, checkOut,
  getStudentAttendance, getStudentViolations,
} = require('../controllers/attendance.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

// Student-only routes
router.get('/today',     authorize('student'), getToday);
router.get('/history',   authorize('student'), getHistory);
router.get('/summary',   authorize('student'), getSummary);
router.post('/checkin',  authorize('student'), checkIn);
router.post('/checkout', authorize('student'), checkOut);

// Supervisor routes — view a student's attendance timeline and violations
router.get(
  '/student/:studentId',
  authorize('industry_supervisor', 'institution_supervisor'),
  getStudentAttendance
);
router.get(
  '/student/:studentId/violations',
  authorize('industry_supervisor', 'institution_supervisor'),
  getStudentViolations
);

module.exports = router;
