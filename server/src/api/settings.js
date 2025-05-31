const express = require('express');
const router = express.Router();
const settingsService = require('../services/settingsService');
const { requireAuth, isAdmin } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/settings/test
 * @desc    Test endpoint to check if settings API is working
 * @access  Public
 */
router.get('/test', (req, res) => {
  console.log('Settings API test endpoint hit');
  return res.json({
    success: true,
    message: 'Settings API is working',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   POST /api/settings/public-reset
 * @desc    Reset all settings to defaults - public endpoint for testing
 * @access  Public
 */
router.post('/public-reset', async (req, res) => {
  console.log('Public settings reset endpoint hit');
  try {
    // This is a public endpoint for troubleshooting only
    const result = await settingsService.resetSettings();
    console.log('Public settings reset successful:', result);
    res.json({
      ...result,
      message: 'Settings reset successful (PUBLIC API)'
    });
  } catch (error) {
    console.error('Public settings reset error:', error);
    res.status(500).json({
      error: 'Failed to reset settings: ' + error.message
    });
  }
});

/**
 * Helper function to check if user has permission to access/modify a category
 * @param {string} category - Setting category
 * @param {object} user - User object from request
 * @param {boolean} isGlobal - Whether accessing global settings or user settings
 * @returns {boolean} - Whether user has permission
 */
function hasPermission(category, user, isGlobal = false) {
  // For user-specific settings (non-global)
  if (!isGlobal) {
    // Both admin and regular users can access/modify their own LLM and security settings
    return category === 'llm' || category === 'security';
  }
  
  // For global settings
  if (user.role === 'admin') {
    // Admin can change global server and email settings
    return category === 'server' || category === 'email';
  }
  
  // Regular users have no access to global settings
  return false;
}

/**
 * @route   GET /api/settings
 * @desc    Get all settings (non-sensitive values)
 * @access  Private/Admin for global settings, any authenticated user for user settings
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { user } = req.query;
    const userId = user === 'me' ? req.user.id : null;
    
    // If getting user-specific settings
    if (userId) {
      const settings = await settingsService.getAllSettings(true, userId);
      
      // Filter settings based on permissions
      const filteredSettings = settings.filter(s => hasPermission(s.category, req.user, false));
      
      return res.json(filteredSettings);
    }
    
    // For global settings, require admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required to view global settings.'
      });
    }
    
    // Even admins can only see server settings for global config
    const allSettings = await settingsService.getAllSettings(true);
    const filteredSettings = allSettings.filter(s => hasPermission(s.category, req.user, true));
    
    res.json(filteredSettings);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/settings/id/:id
 * @desc    Get a single setting by id
 * @access  Private/Admin for global settings, any authenticated user for user settings
 */
router.get('/id/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user } = req.query;
    const userId = user === 'me' ? req.user.id : null;
    
    // If getting user-specific setting
    if (userId) {
      const setting = await settingsService.getSettingById(id, true, userId);
      
      // Check permission based on category
      if (!hasPermission(setting.category, req.user, false)) {
        return res.status(403).json({
          error: `You don't have permission to access ${setting.category} settings.`
        });
      }
      
      return res.json(setting);
    }
    
    // For global setting, require admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required to view global settings.'
      });
    }
    
    const setting = await settingsService.getSettingById(id, true);
    
    // Check permission for admin accessing global settings
    if (!hasPermission(setting.category, req.user, true)) {
      return res.status(403).json({
        error: `Even as admin, you can only access global server settings, not ${setting.category} settings.`
      });
    }
    
    res.json(setting);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/settings/:category
 * @desc    Get settings by category
 * @access  Private/Admin for global settings, any authenticated user for user settings
 */
router.get('/:category', requireAuth, async (req, res, next) => {
  try {
    const { category } = req.params;
    const { user } = req.query;
    
    // Skip if category is 'test' or 'public-reset' as they are handled by other routes
    if (category === 'test' || category === 'public-reset') {
      return next();
    }
    
    const userId = user === 'me' ? req.user.id : null;
    
    // If getting user-specific settings
    if (userId) {
      // Check permission based on category
      if (!hasPermission(category, req.user, false)) {
        return res.status(403).json({
          error: `You don't have permission to access ${category} settings.`
        });
      }
      
      const settings = await settingsService.getSettingsByCategory(category, true, userId);
      return res.json(settings);
    }
    
    // For global settings, require admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required to view global settings.'
      });
    }
    
    // Check permission for admin accessing global settings
    if (!hasPermission(category, req.user, true)) {
      return res.status(403).json({
        error: `Even as admin, you can only access global server settings, not ${category} settings.`
      });
    }
    
    const settings = await settingsService.getSettingsByCategory(category, true);
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/settings
 * @desc    Update multiple settings
 * @access  Private/Admin for global settings, any authenticated user for user settings
 */
router.put('/', requireAuth, async (req, res, next) => {
  try {
    const { settings, user } = req.body;
    
    if (!settings || !Array.isArray(settings)) {
      return res.status(400).json({ error: 'Invalid request format. Expected array of settings.' });
    }
    
    // Validate input
    for (const setting of settings) {
      if (!setting.id || setting.value === undefined) {
        return res.status(400).json({ 
          error: 'Each setting must have an id and value property',
          invalidSetting: setting
        });
      }
    }
    
    const userId = user === 'me' ? req.user.id : null;
    
    // If updating user-specific settings
    if (userId) {
      // Get current settings to check categories
      const currentSettings = await Promise.all(
        settings.map(s => settingsService.getSettingById(s.id, false, userId))
      );
      
      // Check permissions for each setting
      for (const setting of currentSettings) {
        if (!hasPermission(setting.category, req.user, false)) {
          return res.status(403).json({
            error: `You don't have permission to modify ${setting.category} settings.`
          });
        }
      }
      
      const result = await settingsService.updateSettings(settings, userId);
      return res.json(result);
    }
    
    // For global settings, require admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required to update global settings.'
      });
    }
    
    // Get current settings to check categories
    const currentSettings = await Promise.all(
      settings.map(s => settingsService.getSettingById(s.id, false))
    );
    
    // Check permissions for each setting
    for (const setting of currentSettings) {
      if (!hasPermission(setting.category, req.user, true)) {
        return res.status(403).json({
          error: `Even as admin, you can only modify global server settings, not ${setting.category} settings.`
        });
      }
    }
    
    const result = await settingsService.updateSettings(settings);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/settings/:id
 * @desc    Update a single setting
 * @access  Private/Admin for global settings, any authenticated user for user settings
 */
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { value, user } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }
    
    const userId = user === 'me' ? req.user.id : null;
    
    // If updating user-specific setting
    if (userId) {
      // Get current setting to check category
      const currentSetting = await settingsService.getSettingById(id, false, userId);
      
      // Check permission based on category
      if (!hasPermission(currentSetting.category, req.user, false)) {
        return res.status(403).json({
          error: `You don't have permission to modify ${currentSetting.category} settings.`
        });
      }
      
      const result = await settingsService.updateSetting(id, value, userId);
      return res.json(result);
    }
    
    // For global setting, require admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required to update global settings.'
      });
    }
    
    // Get current setting to check category
    const currentSetting = await settingsService.getSettingById(id, false);
    
    // Check permission for admin updating global settings
    if (!hasPermission(currentSetting.category, req.user, true)) {
      return res.status(403).json({
        error: `Even as admin, you can only modify global server settings, not ${currentSetting.category} settings.`
      });
    }
    
    const result = await settingsService.updateSetting(id, value);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/settings/reset
 * @desc    Reset all settings to defaults or reset user settings
 * @access  Private/Admin for global settings, any authenticated user for their own settings
 */
router.post('/reset', requireAuth, async (req, res, next) => {
  try {
    const { user } = req.body;
    const userId = user === 'me' ? req.user.id : null;
    
    // If resetting user-specific settings
    if (userId) {
      console.log(`Resetting user settings for user ${userId} (${req.user.username})`);
      const result = await settingsService.resetSettings(userId);
      console.log('User settings reset successful:', result);
      return res.json(result);
    }
    
    // For global settings reset, require admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required to reset global settings.'
      });
    }
    
    console.log('Resetting global settings to defaults, requested by admin:', req.user?.username);
    const result = await settingsService.resetSettings();
    console.log('Global settings reset successful:', result);
    res.json(result);
  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({
      error: 'Failed to reset settings: ' + error.message
    });
  }
});

module.exports = router;
