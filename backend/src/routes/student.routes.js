const express  = require('express');
const router   = express.Router();
const { completeOnboarding, getProfile, getMyDashboard, getMyGrades, searchIndustrySupervisors, nominateSupervisor, registerWorkLocation, getWorkLocation } = require('../controllers/student.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);
router.use(authorize('student'));

router.post('/onboarding',          completeOnboarding);
router.get('/profile',              getProfile);
router.get('/dashboard',            getMyDashboard);
router.get('/grades',               getMyGrades);
router.get('/search/supervisors',   searchIndustrySupervisors);
router.post('/nominate-supervisor', nominateSupervisor);
router.get('/work-location',        getWorkLocation);
router.post('/work-location',       registerWorkLocation);

module.exports = router;
