const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/search.controller');
const { protect } = require('../middleware/auth.middleware');

// Auto-suggest endpoints — any authenticated user
router.get('/universities', protect, ctrl.universities);
router.get('/departments',  protect, ctrl.departments);
router.get('/companies',    protect, ctrl.companies);
router.get('/states',       protect, ctrl.states);
router.get('/lgas',         protect, ctrl.lgas);

// Student search — supervisors only (role checked inside controller)
router.get('/students', protect, ctrl.students);

module.exports = router;
