const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db/database');
const emailService = require('./emailService');

class AuthService {
  constructor() {
    this.saltRounds = 12;
    this.jwtSecret = process.env.JWT_SECRET || 'default_secret_please_change';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
  }

  async registerUser(username, password) {
    try {
      // Check if registration is enabled from settings
      const settingsService = require('./settingsService');
      const registrationEnabled = await settingsService.getSettingValue('registration_enabled');
      
      console.log('Registration enabled setting:', registrationEnabled, typeof registrationEnabled);
      
      // More robust check that handles different value formats
      if (registrationEnabled !== 'true' && 
          registrationEnabled !== true && 
          registrationEnabled?.toLowerCase?.() !== 'true') {
        throw new Error('Registration is currently disabled');
      }
      
      // Check if user already exists
      const existingUser = await db.get(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      if (existingUser) {
        throw new Error('User already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, this.saltRounds);

      // Insert user with role 'user'
      const result = await db.run(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [username, hashedPassword, 'user']
      );

      return {
        id: result.id,
        username,
        role: 'user',
        message: 'User registered successfully'
      };
    } catch (error) {
      console.error('Registration error:', error.message);
      throw error;
    }
  }

  async loginUser(username, password) {
    try {
      // Get user from database
      const user = await db.get(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Generate JWT token with role included
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username,
          role: user.role || 'user' // Default to 'user' if role is not set
        },
        this.jwtSecret,
        { expiresIn: this.jwtExpiresIn }
      );

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role || 'user',
          created_at: user.created_at
        }
      };
    } catch (error) {
      console.error('Login error:', error.message);
      throw error;
    }
  }

  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      return decoded;
    } catch (error) {
      console.error('Token verification error:', error.message);
      throw new Error('Invalid or expired token');
    }
  }

  async getUserById(id) {
    try {
      const user = await db.get(
        'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
        [id]
      );

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      console.error('Get user error:', error.message);
      throw error;
    }
  }
  
  async updateUserProfile(userId, profileData) {
    try {
      const { email } = profileData;
      
      // Update user
      await db.run(
        'UPDATE users SET email = ? WHERE id = ?',
        [email, userId]
      );
      
      // Get updated user
      return this.getUserById(userId);
    } catch (error) {
      console.error(`Update user profile error for user ${userId}:`, error.message);
      throw error;
    }
  }
  
  async changeUserPassword(userId, currentPassword, newPassword) {
    try {
      // Get user from database
      const user = await db.get(
        'SELECT password FROM users WHERE id = ?',
        [userId]
      );

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

      if (!isPasswordValid) {
        throw new Error('Invalid current password');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, this.saltRounds);

      // Update password
      await db.run(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, userId]
      );

      return { success: true };
    } catch (error) {
      console.error(`Change password error for user ${userId}:`, error.message);
      throw error;
    }
  }

  async refreshToken(token) {
    try {
      const decoded = this.verifyToken(token);
      const user = await this.getUserById(decoded.id);

      // Generate new token with role included
      const newToken = jwt.sign(
        { 
          id: user.id, 
          username: user.username,
          role: user.role || 'user'
        },
        this.jwtSecret,
        { expiresIn: this.jwtExpiresIn }
      );

      return {
        token: newToken,
        user
      };
    } catch (error) {
      console.error('Token refresh error:', error.message);
      throw error;
    }
  }

  // Extract token from Authorization header
  extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      throw new Error('No authorization header provided');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new Error('Invalid authorization header format');
    }

    return parts[1];
  }

  // Password reset methods
  async requestPasswordReset(usernameOrEmail) {
    try {
      // Find user by username or email
      const user = await db.get(
        'SELECT id, username, email FROM users WHERE username = ? OR email = ?',
        [usernameOrEmail, usernameOrEmail]
      );

      if (!user) {
        // Don't reveal whether a user exists for security
        return { success: true, message: 'If a matching account was found, a password reset email has been sent.' };
      }

      // Check if user has an email
      if (!user.email) {
        throw new Error('User does not have an email address configured');
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

      // Store reset token in database
      await db.run(
        'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
        [resetToken, expiresAt.toISOString(), user.id]
      );

      // Generate reset link
      const baseUrl = process.env.BASE_URL || 'http://localhost:8080';
      const resetLink = `${baseUrl}/reset-password/${resetToken}`;

      // Send email with reset link
      await emailService.sendPasswordResetEmail(user.email, resetLink, user.username);

      return { success: true, message: 'If a matching account was found, a password reset email has been sent.' };
    } catch (error) {
      console.error('Password reset request error:', error.message);
      throw error;
    }
  }

  async verifyResetToken(token) {
    try {
      // Find user with this token
      const user = await db.get(
        'SELECT id, username, reset_token_expires FROM users WHERE reset_token = ?',
        [token]
      );

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      // Check if token is expired
      const expiresAt = new Date(user.reset_token_expires);
      if (expiresAt < new Date()) {
        throw new Error('Reset token has expired');
      }

      return { 
        success: true, 
        username: user.username 
      };
    } catch (error) {
      console.error('Reset token verification error:', error.message);
      throw error;
    }
  }

  async resetPassword(token, newPassword) {
    try {
      // Verify token first
      await this.verifyResetToken(token);

      // Find user with this token
      const user = await db.get(
        'SELECT id FROM users WHERE reset_token = ?',
        [token]
      );

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, this.saltRounds);

      // Update password and clear reset token
      await db.run(
        'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
        [hashedPassword, user.id]
      );

      return { success: true, message: 'Password has been reset successfully' };
    } catch (error) {
      console.error('Password reset error:', error.message);
      throw error;
    }
  }
}

module.exports = new AuthService();
