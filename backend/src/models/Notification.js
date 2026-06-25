const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title:     { type: String, required: true },
    body:      { type: String, required: true },
    type: {
      type: String,
      enum: ['logbook_reminder', 'grade_posted', 'supervisor_comment', 'attendance_flagged', 'attendance_checkin', 'attendance_checkout', 'general'],
      default: 'general',
    },
    isRead:    { type: Boolean, default: false },
    readAt:    { type: Date },
    metadata:  { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
