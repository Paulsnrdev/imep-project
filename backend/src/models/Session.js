const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refreshToken: { type: String, required: true, select: false },
    deviceInfo:   { type: String, default: 'Unknown device' },
    ipAddress:    { type: String, default: null },
    lastUsedAt:   { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Session', sessionSchema);
