const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/messaging.controller');

router.use(protect, authorize('industry_supervisor', 'institution_supervisor', 'student'));

router.get('/conversations',    ctrl.getConversations);
router.get('/:conversationId',  ctrl.getMessages);
router.post('/:conversationId', ctrl.sendMessage);

module.exports = router;
