const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/institutionSupervisor.controller');

router.use(protect, authorize('institution_supervisor'));

router.post('/onboarding',                 ctrl.completeOnboarding);
router.get('/profile',                     ctrl.getProfile);
router.get('/dashboard',                   ctrl.getDashboard);
router.get('/students',                    ctrl.getMyStudents);
router.get('/students/:studentId/logbook', ctrl.getStudentLogbook);
router.get('/students/:studentId/profile', ctrl.getStudentProfile);
router.get('/grades',                      ctrl.getGradesOverview);
router.get('/leaderboard',                 ctrl.getLeaderboard);
router.get('/search/students',             ctrl.searchUnassignedStudents);
router.get('/search/supervisors',          ctrl.searchIndustrySupervisors);
router.post('/internships',                ctrl.createInternshipAssignment);

module.exports = router;
