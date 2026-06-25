const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { uploadProfilePhoto } = require('../middleware/upload.middleware');
const ctrl = require('../controllers/me.controller');

router.use(protect);

router.get('/',                ctrl.getMe);
router.patch('/',              uploadProfilePhoto, ctrl.updateMe);
router.patch('/password',      ctrl.changePassword);
router.put('/fcm-token',       ctrl.saveFcmToken);

router.get('/sessions',        ctrl.getSessions);
router.delete('/sessions',     ctrl.revokeOtherSessions);
router.delete('/sessions/:id', ctrl.revokeSession);

module.exports = router;
