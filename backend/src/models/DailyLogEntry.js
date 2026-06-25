const mongoose = require('mongoose');

const dailyLogEntrySchema = new mongoose.Schema(
  {
    logbookWeek:          { type: mongoose.Schema.Types.ObjectId, ref: 'LogbookWeek', required: true },
    student:              { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      required: true,
    },
    activitiesCarriedOut: { type: String, required: true },
    skillsLearned:        { type: String },
    challenges:           { type: String },
    planForTomorrow:      { type: String },
  },
  { timestamps: true }
);

dailyLogEntrySchema.index({ logbookWeek: 1, dayOfWeek: 1 }, { unique: true });

module.exports = mongoose.model('DailyLogEntry', dailyLogEntrySchema);
