const express = require('express');
const router  = express.Router();
const {
  getWeeks, getWeekEntries, upsertEntry,
  uploadWeeklyImage, addSupervisorComment,
} = require('../controllers/logbook.controller');
const { protect, authorize }   = require('../middleware/auth.middleware');
const { uploadWeeklyImage: uploadMiddleware } = require('../middleware/upload.middleware');

router.use(protect);

// Student routes
router.get('/weeks',                  authorize('student'), getWeeks);
router.get('/weeks/:weekId/entries',  authorize('student'), getWeekEntries);
router.post('/weeks/:weekId/entries', authorize('student'), upsertEntry);

// Student uploads weekly image (only if all 5 entries done and week not locked)
router.post(
  '/weeks/:weekId/image',
  authorize('student'),
  uploadMiddleware,
  uploadWeeklyImage
);

// Industry supervisor adds/updates comment on a week
router.post(
  '/weeks/:weekId/comment',
  authorize('industry_supervisor'),
  addSupervisorComment
);

module.exports = router;
