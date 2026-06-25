const mongoose = require('mongoose');

const institutionSupervisorProfileSchema = new mongoose.Schema(
  {
    user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    staffId:       { type: String, required: true, unique: true, trim: true },
    university:    { type: String, required: true },
    department:    { type: String },
    phone:         { type: String },
    officeAddress: { type: String },
    state:         { type: String, trim: true },
    lga:           { type: String, trim: true },
  },
  { timestamps: true }
);

institutionSupervisorProfileSchema.index({ lga: 1 });
institutionSupervisorProfileSchema.index({ state: 1 });

module.exports = mongoose.model('InstitutionSupervisorProfile', institutionSupervisorProfileSchema);
