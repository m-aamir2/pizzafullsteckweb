const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const { ROLES } = require('../config/constants');

const isAuthorizedAdmin = (user) => {
  const authorizedEmail = process.env.ADMIN_AUTHORIZED_EMAIL?.trim().toLowerCase();
  return user.role === ROLES.ADMIN && (!authorizedEmail || user.email === authorizedEmail);
};

const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Not authorized, no token provided');
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new ApiError(401, 'Not authorized, invalid or expired token');
  }

  const user = await User.findById(decoded.id);
  if (!user) throw new ApiError(401, 'Not authorized, user no longer exists');

  req.user = user;
  next();
});

const requireVerified = (req, res, next) => {
  if (!isAuthorizedAdmin(req.user) && !req.user.isVerified) {
    throw new ApiError(403, 'Please verify your email before continuing');
  }
  next();
};

const requireAdmin = (req, res, next) => {
  // The database role, not the role claim supplied in a token, is authoritative.
  if (!isAuthorizedAdmin(req.user)) {
    throw new ApiError(403, 'Admin access required');
  }
  next();
};

module.exports = { protect, requireVerified, requireAdmin };
