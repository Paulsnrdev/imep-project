const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema(
  {
    user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    matricNumber: { type: String, required: true, unique: true, trim: true },
    department:   { type: String, required: true, trim: true },
    level:        { type: String, required: true },
    university:   { type: String, required: true },
    state:        { type: String, trim: true },
    lga:          { type: String, trim: true },
    phone:        { type: String },
    bio:          { type: String },
    skills:       [{ type: String }],
    // Internship info collected at onboarding
    internshipPlace:     { type: String, trim: true },
    internshipStartDate: { type: Date },
    internshipEndDate:   { type: Date },
    internshipWeeks: {
      type: Number,
      enum: [12, 24, 48, 52],
    },
    documents: {
      acceptanceLetter: { type: String },
      studentId:        { type: String },
    },
    // Registered work/internship location for geofence-based attendance
    workLocation: {
      latitude:     { type: Number },
      longitude:    { type: Number },
      radius:       { type: Number, default: 200 },
      address:      { type: String },
      registeredAt: { type: Date },
    },
    // Allocated institution supervisor (set automatically after onboarding)
    allocatedInstitutionSupervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

studentProfileSchema.index({ university: 1 });
studentProfileSchema.index({ lga: 1 });
studentProfileSchema.index({ state: 1 });

module.exports = mongoose.model('StudentProfile', studentProfileSchema);
