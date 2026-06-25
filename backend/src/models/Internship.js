const mongoose = require('mongoose');

const internshipSchema = new mongoose.Schema(
  {
    student:                { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    industrySupervisor:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    institutionSupervisor:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    company:                { type: String, default: null },
    department:             { type: String },
    startDate:              { type: Date, default: null },
    endDate:                { type: Date, default: null },
    totalWeeks:             { type: Number, default: null },
    workShift:              { type: String, enum: ['8-16', '9-17'], default: '8-16' },
    isActive:               { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'terminated'],
      default: 'active',
    },
    nominatedSupervisorInfo: {
      userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      name:        { type: String, default: null },
      email:       { type: String, default: null },
      phone:       { type: String, default: null },
      company:     { type: String, default: null },
      jobTitle:    { type: String, default: null },
      nominatedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

internshipSchema.index({ student: 1 }, { unique: true });

module.exports = mongoose.model('Internship', internshipSchema);
