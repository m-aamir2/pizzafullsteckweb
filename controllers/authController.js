const bcrypt = require('bcryptjs');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { createRandomToken, hashToken } = require('../utils/crypto');
const sendEmail = require('../utils/sendEmail');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ROLES } = require('../config/constants');

const PASSWORD_HASH_ROUNDS = 12;

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isVerified: user.isVerified,
});

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password || !confirmPassword) {
    throw new ApiError(400, 'All fields are required');
  }
  if (password !== confirmPassword) {
    throw new ApiError(400, 'Passwords do not match');
  }
  if (password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters');
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new ApiError(409, 'An account with this email already exists');

  const hashedPassword = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
  const { token, hash } = createRandomToken();

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    // Deliberately set server-side and never read from req.body. A client cannot
    // promote itself by adding a role field to a registration request.
    role: ROLES.USER,
    verificationToken: hash,
    verificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000, // 24h
  });

  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;
  await sendEmail({
    to: user.email,
    subject: 'Verify your Pizza Delivery account',
    html: `<p>Hi ${user.name},</p><p>Please verify your email by clicking the link below:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 24 hours.</p>`,
  });

  res.status(201).json({
    success: true,
    message: 'Registration successful. Please check your email to verify your account.',
  });
});

// GET /api/auth/verify-email/:token
const verifyEmail = asyncHandler(async (req, res) => {
  const hash = hashToken(req.params.token);

  const user = await User.findOne({
    verificationToken: hash,
    verificationTokenExpires: { $gt: Date.now() },
  }).select('+verificationToken +verificationTokenExpires');

  if (!user) throw new ApiError(400, 'Verification link is invalid or has expired');

  // The client can replay this request in development (React Strict Mode) or a
  // user can reopen the email link. Verification is an idempotent state change:
  // a valid, already-used link remains a success until it expires instead of
  // incorrectly showing a second "verification failed" message.
  if (user.isVerified) {
    return res.json({ success: true, message: 'Email is already verified. You can log in.' });
  }

  user.isVerified = true;
  await user.save();

  res.json({ success: true, message: 'Email verified successfully. You can now log in.' });
});

// POST /api/auth/resend-verification
const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() });

  // Do not reveal whether the account exists
  if (!user || user.isVerified) {
    return res.json({ success: true, message: 'If that account exists and is unverified, a new email has been sent.' });
  }

  const { token, hash } = createRandomToken();
  user.verificationToken = hash;
  user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
  await user.save();

  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;
  await sendEmail({
    to: user.email,
    subject: 'Verify your Pizza Delivery account',
    html: `<p>Please verify your email: <a href="${verifyUrl}">${verifyUrl}</a></p>`,
  });

  res.json({ success: true, message: 'If that account exists and is unverified, a new email has been sent.' });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) throw new ApiError(401, 'Invalid email or password');

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new ApiError(401, 'Invalid email or password');

  // Administration uses a separate endpoint and UI. Do not let an admin token
  // be issued from the customer login flow, even with valid credentials.
  if (user.role === ROLES.ADMIN) {
    throw new ApiError(403, 'Please use the admin login portal');
  }

  if (!user.isVerified) {
    throw new ApiError(403, 'Please verify your email before logging in');
  }

  const token = generateToken({ id: user._id, role: user.role });
  res.json({ success: true, token, user: sanitizeUser(user) });
});

// POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() });

  if (!user) {
    return res.json({ success: true, message: 'If that account exists, a reset link has been sent.' });
  }

  const { token, hash } = createRandomToken();
  user.resetPasswordToken = hash;
  user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save();

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;
  await sendEmail({
    to: user.email,
    subject: 'Reset your Pizza Delivery password',
    html: `<p>You requested a password reset. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, you can ignore this email.</p>`,
  });

  res.json({ success: true, message: 'If that account exists, a reset link has been sent.' });
});

// POST /api/auth/reset-password/:token
const resetPassword = asyncHandler(async (req, res) => {
  const { password, confirmPassword } = req.body;
  if (!password || password !== confirmPassword) {
    throw new ApiError(400, 'Passwords must match and cannot be empty');
  }
  if (password.length < 6) throw new ApiError(400, 'Password must be at least 6 characters');

  const hash = hashToken(req.params.token);
  const user = await User.findOne({
    resetPasswordToken: hash,
    resetPasswordExpires: { $gt: Date.now() },
  }).select('+resetPasswordToken +resetPasswordExpires');

  if (!user) throw new ApiError(400, 'Reset link is invalid or has expired');

  user.password = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ success: true, message: 'Password has been reset. You can now log in.' });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: sanitizeUser(req.user) });
});

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  forgotPassword,
  resetPassword,
  getMe,
};
