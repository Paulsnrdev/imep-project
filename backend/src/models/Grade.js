const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema(
  {
    student:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    internship:  { type: mongoose.Schema.Types.ObjectId, ref: 'Internship', required: true },
    logbookWeek: { type: mongoose.Schema.Types.ObjectId, ref: 'LogbookWeek', required: true },
    weekNumber:  { type: Number, required: true },

    // System-calculated (0-50): attendance (20) + logbook completeness (30)
    attendanceScore: { type: Number, default: 0, min: 0, max: 20 },
    logbookScore:    { type: Number, default: 0, min: 0, max: 30 },
    systemScore:     { type: Number, default: 0, min: 0, max: 50 },

    // Industry supervisor manual (0-50)
    supervisorScore: { type: Number, default: null, min: 0, max: 50 },
    gradedBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    gradedAt:        { type: Date },
    supervisorNote:  { type: String },

    // Total (0-100)
    totalScore:      { type: Number, default: null, min: 0, max: 100 },

    isSystemCalculated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

gradeSchema.index({ student: 1, weekNumber: 1 }, { unique: true });

module.exports = mongoose.model('Grade', gradeSchema);
