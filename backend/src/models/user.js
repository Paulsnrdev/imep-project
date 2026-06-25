const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, required: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:  { type: String, required: true, minlength: 8, select: false },
    role: {
      type: String,
      enum: ['student', 'industry_supervisor', 'institution_supervisor', 'admin'],
      required: true,
    },
    profileImage:          { type: String, default: null },
    fcmToken:              { type: String, default: null },
    isOnboardingComplete:  { type: Boolean, default: false },
    isActive:              { type: Boolean, default: true },
    lastLogin:             { type: Date },
    refreshToken:          { type: String, select: false },
    resetPasswordToken:    { type: String, select: false },
    resetPasswordExpiry:   { type: Date,   select: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('User', userSchema);
