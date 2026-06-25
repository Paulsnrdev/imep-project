const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/industrySupervisor.controller');

router.use(protect, authorize('industry_supervisor'));

router.post('/onboarding',                                  ctrl.completeOnboarding);
router.get('/profile',                                      ctrl.getProfile);
router.get('/dashboard',                                    ctrl.getDashboard);
router.get('/students',                                     ctrl.getMyStudents);
router.get('/students/:studentId/logbook',                  ctrl.getStudentLogbook);
router.get('/students/:studentId/profile',                  ctrl.getStudentProfile);
router.post('/students/:studentId/logbook/:weekId/comment', ctrl.commentOnWeek);
router.get('/grading',                                      ctrl.getGradingList);
router.get('/grading/:studentId',                           ctrl.getStudentGrades);
router.post('/grading/:studentId/week/:weekId',             ctrl.submitGrade);

module.exports = router;
