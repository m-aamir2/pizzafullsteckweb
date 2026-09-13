const bcrypt = require('bcryptjs');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ROLES } = require('../config/constants');

const isAuthorizedAdmin = (user) => {
  const authorizedEmail = process.env.ADMIN_AUTHORIZED_EMAIL?.trim().toLowerCase();
  return user.role === ROLES.ADMIN && (!authorizedEmail || user.email === authorizedEmail);
};

// POST /api/admin/auth/login
// Admin accounts are never created through the public registration endpoint.
// They only exist via the seed script or direct database/environment provisioning.
const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const admin = await User.findOne({ email: email.toLowerCase(), role: ROLES.ADMIN }).select('+password');
  if (!admin || !isAuthorizedAdmin(admin)) throw new ApiError(401, 'Invalid admin credentials');

  const match = await bcrypt.compare(password, admin.password);
  if (!match) throw new ApiError(401, 'Invalid admin credentials');

  const token = generateToken({ id: admin._id, role: ROLES.ADMIN });
  res.json({
    success: true,
    token,
    user: { id: admin._id, name: admin.name, email: admin.email, role: ROLES.ADMIN },
  });
});

module.exports = { adminLogin };
