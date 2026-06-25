const asyncHandler   = require('../utils/asyncHandler');
const Notification   = require('../models/Notification');

// GET /api/notifications?unread=true&limit=20&since=<ISO>
exports.getMyNotifications = asyncHandler(async (req, res) => {
  const { unread, limit = 20, since } = req.query;
  const query = { recipient: req.user._id };
  if (unread === 'true') query.isRead = false;
  if (since) query.createdAt = { $gt: new Date(since) };

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit), 50))
    .lean();

  const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });

  return res.json({ success: true, data: { notifications, unreadCount } });
});

// PATCH /api/notifications/:id/read
exports.markAsRead = asyncHandler(async (req, res) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { isRead: true, readAt: new Date() }
  );
  return res.json({ success: true });
});

// PATCH /api/notifications/read-all
exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
  return res.json({ success: true });
});
