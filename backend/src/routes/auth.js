const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect, generateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// @POST /api/auth/register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { name, email, password, role } = req.body;
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Email already registered' });
  }

  const user = await User.create({ name, email, password, role: role || 'user' });
  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role, plan: user.plan }
  });
}));

// @POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = generateToken(user._id);
  res.json({
    success: true,
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role, plan: user.plan, preferences: user.preferences }
  });
}));

// @GET /api/auth/me
router.get('/me', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ success: true, user });
}));

// @PUT /api/auth/update-profile
router.put('/update-profile', protect, asyncHandler(async (req, res) => {
  const { name, preferences } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { name, preferences },
    { new: true, runValidators: true }
  );
  res.json({ success: true, user });
}));

// @PUT /api/auth/change-password
router.put('/change-password', protect, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+password');
  const { currentPassword, newPassword } = req.body;

  if (!(await user.comparePassword(currentPassword))) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  }

  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password updated successfully' });
}));

module.exports = router;
