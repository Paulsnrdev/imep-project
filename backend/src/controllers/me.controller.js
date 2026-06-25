const User    = require('../models/user');
const Session = require('../models/Session');
const StudentProfile             = require('../models/StudentProfile');
const InstitutionSupervisorProfile = require('../models/InstitutionSupervisorProfile');
const IndustrySupervisorProfile  = require('../models/IndustrySupervisorProfile');
const Internship   = require('../models/Internship');
const asyncHandler = require('../utils/asyncHandler');

const ProfileModel = {
  student:                StudentProfile,
  institution_supervisor: InstitutionSupervisorProfile,
  industry_supervisor:    IndustrySupervisorProfile,
};

// Fields each role is allowed to update on their role profile
const EDITABLE_FIELDS = {
  student: ['phone', 'bio', 'workShift', 'internshipPlace', 'internshipStartDate', 'internshipEndDate'],
  institution_supervisor: ['phone', 'officeAddress', 'department'],
  industry_supervisor:    ['phone', 'officeAddress', 'jobTitle', 'department'],
};

// GET /api/me
exports.getMe = asyncHandler(async (req, res) => {
  const user    = await User.findById(req.user._id).select('-password -refreshToken').lean();
  const Model   = ProfileModel[user.role];
  const profile = Model ? await Model.findOne({ user: user._id }).lean() : null;
  res.json({ success: true, data: { user, profile } });
});

// PATCH /api/me
exports.updateMe = asyncHandler(async (req, res) => {
  const { firstName, lastName, ...rest } = req.body;

  const userUpdate = {};
  if (firstName?.trim()) userUpdate.firstName = firstName.trim();
  if (lastName?.trim())  userUpdate.lastName  = lastName.trim();
  if (req.file?.cloudinaryUrl) {
    userUpdate.profileImage = req.file.cloudinaryUrl;
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: userUpdate },
    { new: true }
  ).select('-password -refreshToken').lean();

  // Update role-specific profile fields
  const Model   = ProfileModel[user.role];
  let profile   = null;
  if (Model) {
    const allowed      = EDITABLE_FIELDS[user.role] ?? [];
    const profileUpdate = {};
    for (const field of allowed) {
      if (rest[field] !== undefined) {
        profileUpdate[field] = typeof rest[field] === 'string'
          ? rest[field].trim() || undefined
          : rest[field];
      }
    }
    profile = Object.keys(profileUpdate).length
      ? await Model.findOneAndUpdate({ user: req.user._id }, { $set: profileUpdate }, { new: true }).lean()
      : await Model.findOne({ user: req.user._id }).lean();

    // Keep Internship dates in sync so the logbook offset calculates correctly
    if (user.role === 'student') {
      const internshipSync = {};
      if (profileUpdate.internshipStartDate !== undefined)
        internshipSync.startDate = profileUpdate.internshipStartDate || null;
      if (profileUpdate.internshipEndDate !== undefined)
        internshipSync.endDate = profileUpdate.internshipEndDate || null;
      if (Object.keys(internshipSync).length) {
        await Internship.updateOne({ student: req.user._id }, { $set: internshipSync });
      }
    }
  }

  res.json({ success: true, data: { user, profile } });
});

// PUT /api/me/fcm-token
exports.saveFcmToken = asyncHandler(async (req, res) => {
  const { fcmToken } = req.body;
  if (!fcmToken?.trim()) {
    return res.status(400).json({ success: false, message: 'fcmToken is required' });
  }
  await User.findByIdAndUpdate(req.user._id, { fcmToken: fcmToken.trim() });
  res.json({ success: true });
});

// PATCH /api/me/password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Both current and new password are required.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
  }

  const user  = await User.findById(req.user._id).select('+password');
  const valid = await user.comparePassword(currentPassword);
  if (!valid) {
    return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
  }

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: 'Password changed successfully.' });
});

// GET /api/me/sessions
exports.getSessions = asyncHandler(async (req, res) => {
  const currentToken = req.cookies?.refreshToken;

  const sessions = await Session.find({ user: req.user._id })
    .select('+refreshToken')
    .sort({ lastUsedAt: -1 });

  res.json({
    success: true,
    data: {
      sessions: sessions.map((s) => ({
        _id:        s._id,
        deviceInfo: s.deviceInfo,
        ipAddress:  s.ipAddress,
        createdAt:  s.createdAt,
        lastUsedAt: s.lastUsedAt,
        isCurrent:  currentToken ? s.refreshToken === currentToken : false,
      })),
    },
  });
});

// DELETE /api/me/sessions/:id  — revoke a specific session
exports.revokeSession = asyncHandler(async (req, res) => {
  const session = await Session.findOne({ _id: req.params.id, user: req.user._id });
  if (!session) {
    return res.status(404).json({ success: false, message: 'Session not found.' });
  }
  await session.deleteOne();
  res.json({ success: true, message: 'Session revoked.' });
});

// DELETE /api/me/sessions  — revoke all sessions except current
exports.revokeOtherSessions = asyncHandler(async (req, res) => {
  const currentToken = req.cookies?.refreshToken;

  if (currentToken) {
    const current = await Session.findOne({ user: req.user._id, refreshToken: currentToken }).select('+refreshToken');
    if (current) {
      await Session.deleteMany({ user: req.user._id, _id: { $ne: current._id } });
    } else {
      await Session.deleteMany({ user: req.user._id });
    }
  } else {
    await Session.deleteMany({ user: req.user._id });
  }

  res.json({ success: true, message: 'All other sessions signed out.' });
});
