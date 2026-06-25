const crypto  = require('crypto');
const User    = require('../models/user');
const Session = require('../models/Session');
const { generateAccessToken, generateRefreshToken } = require('./token.service');
const { sendPasswordResetEmail } = require('./email.service');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const buildUserPayload = (user) => ({
  _id:                  user._id,
  firstName:            user.firstName,
  lastName:             user.lastName,
  email:                user.email,
  role:                 user.role,
  profileImage:         user.profileImage,
  isOnboardingComplete: user.isOnboardingComplete,
});

// Parse a rough device description from the User-Agent string
const parseUserAgent = (ua = '') => {
  let browser = 'Browser';
  if (/Chrome\//.test(ua) && !/Chromium|OPR|Edg/.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
  else if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\//.test(ua)) browser = 'Opera';

  let os = '';
  if (/iPhone/.test(ua))       os = 'iPhone';
  else if (/iPad/.test(ua))    os = 'iPad';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) os = 'Mac';
  else if (/Linux/.test(ua))   os = 'Linux';

  return os ? `${browser} on ${os}` : browser;
};

const issueTokens = async (user, res, req) => {
  const accessToken  = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Create a session record for this login
  await Session.create({
    user:        user._id,
    refreshToken,
    deviceInfo:  parseUserAgent(req?.headers?.['user-agent']),
    ipAddress:   req?.ip ?? null,
    lastUsedAt:  new Date(),
  });

  // Clear legacy single-token field if still set
  if (user.refreshToken) {
    user.refreshToken = null;
    await user.save({ validateBeforeSave: false });
  }

  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
  return accessToken;
};

// ── Register ──────────────────────────────────────────────────────────────────

const register = async (req, res) => {
  const { firstName, lastName, email, password, role } = req.body;

  if (!firstName || !lastName || !email || !password || !role) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  const validRoles = ['student', 'industry_supervisor', 'institution_supervisor'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role.' });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
  }

  const profileImage = req.file?.cloudinaryUrl ?? null;

  const user = await User.create({ firstName, lastName, email, password, role, profileImage });
  const accessToken = await issueTokens(user, res, req);

  res.status(201).json({
    success: true,
    data: {
      user:               buildUserPayload(user),
      accessToken,
      onboardingComplete: false,
    },
  });
};

// ── Login ─────────────────────────────────────────────────────────────────────

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password +refreshToken');
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  if (!user.isActive) {
    return res.status(403).json({ success: false, message: 'Your account has been deactivated.' });
  }

  user.lastLogin = new Date();
  const accessToken = await issueTokens(user, res, req);

  res.json({
    success: true,
    data: {
      user:               buildUserPayload(user),
      accessToken,
      onboardingComplete: user.isOnboardingComplete,
    },
  });
};

// ── Logout ────────────────────────────────────────────────────────────────────

const logout = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    await Session.deleteOne({ refreshToken: token });
    // Also clear legacy single-token field if still used
    await User.findOneAndUpdate({ refreshToken: token }, { refreshToken: null });
  }
  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict' });
  res.json({ success: true, message: 'Logged out successfully.' });
};

// ── Refresh access token ──────────────────────────────────────────────────────

const refresh = async (req, res) => {
  const { verifyRefreshToken, generateAccessToken } = require('./token.service');
  const token = req.cookies?.refreshToken;

  if (!token) {
    return res.status(401).json({ success: false, message: 'No refresh token.' });
  }

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
  }

  // Session-based lookup (new path)
  const session = await Session.findOne({ user: payload.id, refreshToken: token }).select('+refreshToken');
  if (session) {
    session.lastUsedAt = new Date();
    await session.save();
    const accessToken = generateAccessToken(payload.id);
    return res.json({ success: true, data: { accessToken } });
  }

  // Fallback: legacy single-token on User (for existing logged-in users before this change)
  const user = await User.findOne({ _id: payload.id, refreshToken: token }).select('+refreshToken');
  if (!user) {
    return res.status(401).json({ success: false, message: 'Refresh token revoked.' });
  }

  const accessToken = generateAccessToken(user._id);
  res.json({ success: true, data: { accessToken } });
};

// ── Get current user ──────────────────────────────────────────────────────────

const getMe = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }
  res.json({
    success: true,
    data: {
      user:               buildUserPayload(user),
      onboardingComplete: user.isOnboardingComplete,
    },
  });
};

// ── Forgot password ───────────────────────────────────────────────────────────

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+resetPasswordToken +resetPasswordExpiry');
  if (!user) {
    return res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
  }

  const token  = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  user.resetPasswordToken  = token;
  user.resetPasswordExpiry = expiry;
  await user.save({ validateBeforeSave: false });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl    = `${frontendUrl}/reset-password/${token}`;

  try {
    await sendPasswordResetEmail({ to: user.email, resetUrl, firstName: user.firstName });
  } catch (emailErr) {
    console.error('[forgotPassword] Email send failed:', emailErr.message);
  }

  return res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
};

// ── Reset password ────────────────────────────────────────────────────────────

const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ success: false, message: 'Token and new password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
  }

  const user = await User.findOne({
    resetPasswordToken:  token,
    resetPasswordExpiry: { $gt: new Date() },
  }).select('+resetPasswordToken +resetPasswordExpiry');

  if (!user) {
    return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired.' });
  }

  user.password            = password;
  user.resetPasswordToken  = undefined;
  user.resetPasswordExpiry = undefined;
  user.refreshToken        = null;
  await user.save();

  // Revoke all sessions for this user on password reset
  await Session.deleteMany({ user: user._id });

  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict' });
  return res.json({ success: true, message: 'Password reset successfully. Please log in.' });
};

module.exports = { register, login, logout, refresh, getMe, forgotPassword, resetPassword };
