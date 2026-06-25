const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    student:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    internship: { type: mongoose.Schema.Types.ObjectId, ref: 'Internship', required: true },
    date:       { type: Date, required: true },
    checkIn: {
      time:      { type: Date },
      latitude:  { type: Number },
      longitude: { type: Number },
      isLate:    { type: Boolean, default: false },
    },
    checkOut: {
      time:             { type: Date },
      latitude:         { type: Number },
      longitude:        { type: Number },
      isEarlyDeparture: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'half_day'],
      default: 'absent',
    },
    isGeofenceViolation: { type: Boolean, default: false },
    missedCheckout:      { type: Boolean, default: false },
    // Violation reason recorded when student checks in late or checks out early
    violation: {
      type: {
        type: String,
        enum: ['late_checkin', 'early_checkout'],
      },
      reason:    { type: String, trim: true },
      recordedAt: { type: Date },
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ student: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
