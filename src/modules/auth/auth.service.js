'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config');
const AppError = require('../../shared/utils/AppError');
const userRepository = require('../users/user.repository');
const User = require('../users/user.model');

/**
 * Authentication Service.
 * Handles registration, login, token refresh, and logout.
 */
class AuthService {
  /**
   * Generate JWT access token.
   * @param {object} payload
   * @returns {string}
   */
  generateAccessToken(payload) {
    return jwt.sign(
      { ...payload, jti: uuidv4() },
      config.jwt.accessSecret,
      { expiresIn: config.jwt.accessExpiresIn }
    );
  }

  /**
   * Generate JWT refresh token.
   * @param {object} payload
   * @returns {string}
   */
  generateRefreshToken(payload) {
    return jwt.sign(
      { ...payload, jti: uuidv4() },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );
  }

  /**
   * Build the standard token pair returned on login/register.
   * @param {object} user
   */
  async buildTokenPair(user) {
    const tokenPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = this.generateAccessToken(tokenPayload);
    const refreshToken = this.generateRefreshToken(tokenPayload);
    const refreshDecoded = jwt.decode(refreshToken);

    // Store the jti of the current valid refresh token for rotation detection
    await userRepository.updateRefreshToken(user._id, refreshDecoded.jti);

    return { accessToken, refreshToken };
  }

  /**
   * Register a new user.
   * @param {{ name, email, password, phone, role? }} data
   */
  async register(data) {
    const { name, email, password, phone, role = 'customer' } = data;

    // Prevent customers from self-assigning admin/agent roles
    const allowedRole = ['customer'].includes(role) ? role : 'customer';

    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new AppError('An account with this email already exists.', 409);
    }

    const passwordHash = await User.hashPassword(password);
    const user = await userRepository.create({ name, email, passwordHash, phone, role: allowedRole });

    const tokens = await this.buildTokenPair(user);

    // Don't return passwordHash
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, ...tokens };
  }

  /**
   * Register a delivery agent (admin only).
   */
  async registerAgent(data) {
    const { name, email, password, phone } = data;

    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new AppError('An account with this email already exists.', 409);
    }

    const passwordHash = await User.hashPassword(password);
    const user = await userRepository.create({ name, email, passwordHash, phone, role: 'agent' });

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser };
  }

  /**
   * Login with email and password.
   * @param {{ email, password }} credentials
   */
  async login({ email, password }) {
    // Fetch with password hash
    const userWithPassword = await User.findOne({
      email: email.toLowerCase(),
      deletedAt: null,
    }).select('+passwordHash');

    if (!userWithPassword) {
      throw new AppError('Invalid email or password.', 401);
    }

    if (!userWithPassword.isActive) {
      throw new AppError('Your account has been deactivated. Please contact support.', 403);
    }

    const isMatch = await userWithPassword.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401);
    }

    const tokens = await this.buildTokenPair(userWithPassword);

    const user = await userRepository.findById(userWithPassword._id);
    return { user, ...tokens };
  }

  /**
   * Refresh access token using a valid refresh token.
   * Implements token rotation — old refresh token is invalidated.
   * @param {string} refreshToken
   */
  async refresh(refreshToken) {
    if (!refreshToken) {
      throw new AppError('Refresh token is required.', 400);
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch (err) {
      throw new AppError('Invalid or expired refresh token.', 401);
    }

    // Fetch user with refresh token jti
    const user = await User.findOne({ _id: decoded.id, deletedAt: null })
      .select('+refreshTokenHash');

    if (!user || !user.refreshTokenHash) {
      throw new AppError('Session not found. Please log in again.', 401);
    }

    // Compare stored jti against the token's jti (rotation check)
    const isValid = decoded.jti === user.refreshTokenHash;
    if (!isValid) {
      // Potential token theft — invalidate all sessions
      await userRepository.updateRefreshToken(user._id, null);
      throw new AppError('Refresh token reuse detected. Please log in again.', 401);
    }

    // Issue new token pair (rotation)
    const tokens = await this.buildTokenPair(user);
    const safeUser = await userRepository.findById(user._id);
    return { user: safeUser, ...tokens };
  }

  /**
   * Logout — clear the stored refresh token hash.
   * @param {string} userId
   */
  async logout(userId) {
    await userRepository.updateRefreshToken(userId, null);
    return true;
  }
}

module.exports = new AuthService();
