const mongoose = require('mongoose');

const industrySupervisorProfileSchema = new mongoose.Schema(
  {
    user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    staffId:       { type: String, required: true, unique: true, trim: true },
    company:       { type: String, required: true },
    jobTitle:      { type: String },
    department:    { type: String },
    phone:         { type: String },
    officeAddress: { type: String },
    state:         { type: String, trim: true },
    lga:           { type: String, trim: true },
    geofence: {
      latitude:  { type: Number },
      longitude: { type: Number },
      radius:    { type: Number, default: 200 },
      address:   { type: String },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('IndustrySupervisorProfile', industrySupervisorProfileSchema);
