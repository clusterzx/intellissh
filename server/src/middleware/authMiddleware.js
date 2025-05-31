const authService = require('../services/authService');

// Check if user has admin role
const isAdmin = (req, res, next) => {
  try {
    // Check if user exists and has an admin role
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required.'
      });
    }
    
    // Check if user has admin role
    if (req.user.role !== 'admin') {
      console.log('Admin access denied to user:', req.user.username);
      return res.status(403).json({
        error: 'Admin access required.'
      });
    }
    
    console.log('Admin access granted to user:', req.user.username);
    next();
  } catch (error) {
    console.error('Admin authorization error:', error.message);
    return res.status(500).json({
      error: 'Internal server error during authorization.'
    });
  }
};

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      });
    }

    const token = authService.extractTokenFromHeader(authHeader);
    const decoded = authService.verifyToken(token);
    
    // Add user info to request
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    return res.status(401).json({ 
      error: 'Invalid or expired token.' 
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = authService.extractTokenFromHeader(authHeader);
      const decoded = authService.verifyToken(token);
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

// Middleware to validate user ownership of resources
const validateResourceOwnership = (resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      const resourceUserId = req.body.user_id || req.params.user_id;
      
      // If resource has user_id, validate ownership
      if (resourceUserId && parseInt(resourceUserId) !== parseInt(userId)) {
        return res.status(403).json({ 
          error: 'Access denied. You can only access your own resources.' 
        });
      }
      
      next();
    } catch (error) {
      console.error('Resource ownership validation error:', error.message);
      return res.status(500).json({ 
        error: 'Internal server error during authorization.' 
      });
    }
  };
};

// Middleware to add user ID to request body for creation operations
const addUserToBody = (req, res, next) => {
  if (req.user && req.user.id) {
    req.body.user_id = req.user.id;
  }
  next();
};

// Error handling middleware for authentication errors
const handleAuthError = (error, req, res, next) => {
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({ 
      error: 'Invalid token format.' 
    });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({ 
      error: 'Token has expired.' 
    });
  }
  
  if (error.message.includes('authorization')) {
    return res.status(401).json({ 
      error: error.message 
    });
  }
  
  next(error);
};

module.exports = {
  authenticateToken,
  optionalAuth,
  validateResourceOwnership,
  addUserToBody,
  handleAuthError,
  isAdmin,
  requireAuth: authenticateToken // Alias for more readable routes
};
