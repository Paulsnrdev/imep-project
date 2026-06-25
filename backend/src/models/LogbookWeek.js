const mongoose = require('mongoose');

const logbookWeekSchema = new mongoose.Schema(
  {
    internship:       { type: mongoose.Schema.Types.ObjectId, ref: 'Internship', required: true },
    student:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    weekNumber:       { type: Number, required: true },
    weekStartDate:    { type: Date, required: true },
    weekEndDate:      { type: Date, required: true },
    isLocked:         { type: Boolean, default: false },
    startDayOffset:   { type: Number, default: 0 },  // 0=Mon start, 1=Tue start, 2=Wed start, etc.
    lockedAt:         { type: Date },
    // Industry supervisor comment — only written by industry supervisor role
    supervisorComment: { type: String },
    commentedAt:      { type: Date },
    commentedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Weekly image uploaded by student after all 5 daily entries are filled
    weeklyImage:      { type: String, default: null },
    weeklyImageUploadedAt: { type: Date },
  },
  { timestamps: true }
);

logbookWeekSchema.index({ student: 1, weekNumber: 1 }, { unique: true });

module.exports = mongoose.model('LogbookWeek', logbookWeekSchema);
