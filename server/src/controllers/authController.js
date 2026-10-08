const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');

/**
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { name, email, password, phone, preferredLanguage } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ success: false, error: 'Email already registered.' });
    }

    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
      phone,
      preferredLanguage: preferredLanguage || 'en',
    });

    await user.save();

    const tokens = generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.status(201).json({
      success: true,
      data: {
        user: user.toSafeObject(),
        ...tokens,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const tokens = generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json({
      success: true,
      data: {
        user: user.toSafeObject(),
        ...tokens,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/refresh
 */
async function refreshToken(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, error: 'Refresh token required.' });
    }

    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    const user = await User.findById(decoded.userId).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, error: 'Invalid refresh token.' });
    }

    const tokens = generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json({ success: true, data: tokens });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/user/profile
 */
async function getProfile(req, res, next) {
  try {
    if (!req.userId) {
      return res.json({ success: true, data: null, isGuest: true });
    }
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    res.json({ success: true, data: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/user/profile
 */
async function updateProfile(req, res, next) {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const updates = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.phone) updates.phone = req.body.phone;
    if (req.body.preferredLanguage) updates.preferredLanguage = req.body.preferredLanguage;
    if (req.body.location) updates.location = req.body.location;

    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true, runValidators: true });
    res.json({ success: true, data: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
}

function generateTokens(userId) {
  const accessToken = jwt.sign({ userId }, config.jwt.secret, { expiresIn: config.jwt.expiry });
  const refreshToken = jwt.sign({ userId }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiry });
  return { accessToken, refreshToken };
}

module.exports = { register, login, refreshToken, getProfile, updateProfile };
