const express = require('express');
const router  = express.Router();
const { register, login, logout, refresh, getMe, forgotPassword, resetPassword } = require('../controllers/auth.controller');
const { protect }            = require('../middleware/auth.middleware');
const { uploadProfilePhoto } = require('../middleware/upload.middleware');

// Profile photo is optional on registration; multer adds req.file when provided
router.post('/register',       uploadProfilePhoto, register);
router.post('/login',          login);
router.post('/logout',         logout);
router.post('/refresh',        refresh);
router.get('/me',              protect, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password',  resetPassword);

module.exports = router;
