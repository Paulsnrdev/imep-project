const express  = require('express');
const router   = express.Router();
const { getMyNotifications, markAsRead, markAllRead } = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/',              getMyNotifications);
router.patch('/read-all',    markAllRead);
router.patch('/:id/read',    markAsRead);

module.exports = router;
