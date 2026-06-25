const express = require('express');
const router  = express.Router();
const {
  getStats,
  getUsers,
  getUser,
  toggleUserActive,
  deleteUser,
  syncLogbookWeeks,
  recoverLogbookEntries,
  getUserDashboard,
  updateUserProfile,
  getStudentLogbookAdmin,
  commentOnWeekAdmin,
  submitGradeAdmin,
  changeSupervisorsAdmin,
  getStudentAttendanceAdmin,
  updateAttendanceAdmin,
} = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);
router.use(authorize('admin'));

router.get('/stats',                                    getStats);
router.get('/users',                                    getUsers);
router.get('/users/:id',                                getUser);
router.patch('/users/:id/toggle-active',                toggleUserActive);
router.delete('/users/:id',                             deleteUser);
router.post('/sync-logbook-weeks/:studentId',           syncLogbookWeeks);
router.post('/recover-logbook/:studentId',              recoverLogbookEntries);

// ── Per-user admin view & edit ─────────────────────────────────────────────────
router.get('/users/:id/dashboard',                      getUserDashboard);
router.patch('/users/:id/profile',                      updateUserProfile);
router.patch('/users/:id/supervisors',                  changeSupervisorsAdmin);
router.get('/users/:id/logbook',                        getStudentLogbookAdmin);
router.post('/users/:id/logbook/:weekId/comment',       commentOnWeekAdmin);
router.post('/users/:id/grade/:weekId',                 submitGradeAdmin);
router.get('/users/:id/attendance',                     getStudentAttendanceAdmin);
router.patch('/users/:id/attendance/:attendanceId',     updateAttendanceAdmin);

module.exports = router;
