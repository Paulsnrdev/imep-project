const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    // Scoped to a specific student's internship
    internship:            { type: mongoose.Schema.Types.ObjectId, ref: 'Internship', required: true },
    student:               { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    industrySupervisor:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    institutionSupervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lastMessage:           { type: String },
    lastMessageAt:         { type: Date },
    unreadCount: {
      industrySupervisor:    { type: Number, default: 0 },
      institutionSupervisor: { type: Number, default: 0 },
      student:               { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

conversationSchema.index({ internship: 1 }, { unique: true });

module.exports = mongoose.model('Conversation', conversationSchema);
