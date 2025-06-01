const express = require('express');
const rateLimit = require('express-rate-limit');
const authService = require('../services/authService');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login attempts per windowMs
  message: {
    error: 'Too many login attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required.'
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        error: 'Username must be at least 3 characters long.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long.'
      });
    }

    // Register user
    const result = await authService.registerUser(username.trim(), password);

    res.status(201).json({
      success: true,
      message: result.message,
      user: {
        id: result.id,
        username: result.username
      }
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    
    if (error.message === 'User already exists') {
      return res.status(409).json({
        error: 'Username is already taken.'
      });
    }
    
    if (error.message === 'Registration is currently disabled') {
      return res.status(403).json({
        error: 'Registration is currently disabled by the administrator.'
      });
    }

    res.status(500).json({
      error: 'Internal server error during registration.'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required.'
      });
    }

    // Login user
    const result = await authService.loginUser(username.trim(), password);

    res.json({
      success: true,
      message: 'Login successful.',
      token: result.token,
      user: result.user
    });
  } catch (error) {
    console.error('Login error:', error.message);
    
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({
        error: 'Invalid username or password.'
      });
    }

    res.status(500).json({
      error: 'Internal server error during login.'
    });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authService.extractTokenFromHeader(authHeader);
    
    const result = await authService.refreshToken(token);

    res.json({
      success: true,
      message: 'Token refreshed successfully.',
      token: result.token,
      user: result.user
    });
  } catch (error) {
    console.error('Token refresh error:', error.message);
    
    res.status(401).json({
      error: 'Unable to refresh token.'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user info
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await authService.getUserById(req.user.id);

    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    console.error('Get user error:', error.message);
    
    if (error.message === 'User not found') {
      return res.status(404).json({
        error: 'User not found.'
      });
    }

    res.status(500).json({
      error: 'Internal server error while fetching user info.'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // In a stateless JWT system, logout is typically handled client-side
    // by removing the token from storage. However, we can log the action.
    console.log(`User ${req.user.username} logged out`);

    res.json({
      success: true,
      message: 'Logout successful.'
    });
  } catch (error) {
    console.error('Logout error:', error.message);
    
    res.status(500).json({
      error: 'Internal server error during logout.'
    });
  }
});

// @route   POST /api/auth/verify
// @desc    Verify token validity
// @access  Private
router.post('/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid.',
    user: {
      id: req.user.id,
      username: req.user.username
    }
  });
});

// @route   POST /api/auth/forgot-password
// @desc    Request a password reset email
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { usernameOrEmail } = req.body;
    
    if (!usernameOrEmail) {
      return res.status(400).json({
        error: 'Username or email is required.'
      });
    }
    
    const result = await authService.requestPasswordReset(usernameOrEmail);
    
    // Always return a success response for security
    // This way we don't reveal if a user exists or not
    res.json({
      success: true,
      message: 'If a matching account was found, a password reset email has been sent.'
    });
  } catch (error) {
    console.error('Forgot password error:', error.message);
    
    // For security, always return the same success message even on errors
    // But log the error for debugging
    res.json({
      success: true,
      message: 'If a matching account was found, a password reset email has been sent.'
    });
  }
});

// @route   GET /api/auth/reset-password/:token
// @desc    Verify a password reset token
// @access  Public
router.get('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const result = await authService.verifyResetToken(token);
    
    res.json({
      success: true,
      username: result.username
    });
  } catch (error) {
    console.error('Reset token verification error:', error.message);
    
    res.status(400).json({
      error: 'Invalid or expired reset token.'
    });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password using token
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // Validation
    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'Token and new password are required.'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long.'
      });
    }
    
    const result = await authService.resetPassword(token, newPassword);
    
    res.json(result);
  } catch (error) {
    console.error('Password reset error:', error.message);
    
    if (error.message === 'Invalid or expired reset token' || error.message === 'Reset token has expired') {
      return res.status(400).json({
        error: 'Invalid or expired reset token.'
      });
    }
    
    res.status(500).json({
      error: 'Internal server error while resetting password.'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile (email)
// @access  Private
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email format
    if (email && !validateEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email format.'
      });
    }
    
    const result = await authService.updateUserProfile(req.user.id, { email });
    
    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: result
    });
  } catch (error) {
    console.error('Profile update error:', error.message);
    
    res.status(500).json({
      error: 'Internal server error while updating profile.'
    });
  }
});

// @route   PUT /api/auth/password
// @desc    Change user password
// @access  Private
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required.'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long.'
      });
    }
    
    await authService.changeUserPassword(req.user.id, currentPassword, newPassword);
    
    res.json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (error) {
    console.error('Password change error:', error.message);
    
    if (error.message === 'Invalid current password') {
      return res.status(401).json({
        error: 'Current password is incorrect.'
      });
    }
    
    res.status(500).json({
      error: 'Internal server error while changing password.'
    });
  }
});

// Email validation helper
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

module.exports = router;
