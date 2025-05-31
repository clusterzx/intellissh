const db = require('../db/database');

class SettingsService {
  constructor() {
    this.cache = new Map();
    this.userCache = new Map();
    this.cacheExpiry = null;
    this.userCacheExpiry = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  }
  
  /**
   * Get all settings from the database
   * @param {boolean} hideSensitive - Whether to hide sensitive settings values
   * @param {number} userId - Optional user ID to get user-specific settings
   * @returns {Promise<Array>} - Array of settings
   */
  async getAllSettings(hideSensitive = true, userId = null) {
    try {
      // If userId is provided, get user-specific settings
      if (userId) {
        return this.getAllUserSettings(userId, hideSensitive);
      }
      
      // Try to get from cache if it's valid
      if (this.isCacheValid()) {
        const cachedSettings = [...this.cache.values()];
        return hideSensitive ? this.hideSensitiveValues(cachedSettings) : cachedSettings;
      }
      
      // Get from database
      const settings = await db.all('SELECT * FROM settings ORDER BY category, name');
      
      // Update cache
      this.updateCache(settings);
      
      return hideSensitive ? this.hideSensitiveValues(settings) : settings;
    } catch (error) {
      console.error('Get all settings error:', error.message);
      throw error;
    }
  }
  
  /**
   * Get all settings for a specific user, falling back to global settings when user-specific settings don't exist
   * @param {number} userId - The user ID
   * @param {boolean} hideSensitive - Whether to hide sensitive settings values
   * @returns {Promise<Array>} - Array of settings with user overrides applied
   */
  async getAllUserSettings(userId, hideSensitive = true) {
    try {
      // Try to get from user cache if it's valid
      if (this.isUserCacheValid(userId)) {
        const cachedSettings = this.userCache.get(userId);
        return hideSensitive ? this.hideSensitiveValues(cachedSettings) : cachedSettings;
      }
      
      // Get global settings first
      const globalSettings = await this.getAllSettings(false);
      
      // Get user-specific settings
      const userSettings = await db.all(
        `SELECT us.user_id, us.setting_id, us.value, us.updated_at, 
                s.id, s.name, s.category, s.description, s.is_sensitive 
         FROM user_settings us 
         JOIN settings s ON us.setting_id = s.id 
         WHERE us.user_id = ?`,
        [userId]
      );
      
      // Create a map of user settings by setting ID
      const userSettingsMap = new Map();
      userSettings.forEach(setting => {
        userSettingsMap.set(setting.setting_id, {
          id: setting.setting_id,
          name: setting.name,
          value: setting.value,
          category: setting.category,
          description: setting.description,
          is_sensitive: setting.is_sensitive,
          updated_at: setting.updated_at,
          user_id: setting.user_id
        });
      });
      
      // Merge global settings with user overrides
      const mergedSettings = globalSettings.map(setting => {
        if (userSettingsMap.has(setting.id)) {
          return userSettingsMap.get(setting.id);
        }
        return setting;
      });
      
      // Update user cache
      this.updateUserCache(userId, mergedSettings);
      
      return hideSensitive ? this.hideSensitiveValues(mergedSettings) : mergedSettings;
    } catch (error) {
      console.error(`Get all user settings error for user ${userId}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Get settings by category
   * @param {string} category - Category to filter by
   * @param {boolean} hideSensitive - Whether to hide sensitive settings values
   * @param {number} userId - Optional user ID to get user-specific settings
   * @returns {Promise<Array>} - Array of settings in the specified category
   */
  async getSettingsByCategory(category, hideSensitive = true, userId = null) {
    try {
      // If userId is provided, get user-specific settings for the category
      if (userId) {
        const userSettings = await this.getAllUserSettings(userId, hideSensitive);
        return userSettings.filter(s => s.category === category);
      }
      
      // Try to get from cache if it's valid
      if (this.isCacheValid()) {
        const cachedSettings = [...this.cache.values()].filter(s => s.category === category);
        return hideSensitive ? this.hideSensitiveValues(cachedSettings) : cachedSettings;
      }
      
      // Get from database
      const settings = await db.all(
        'SELECT * FROM settings WHERE category = ? ORDER BY name',
        [category]
      );
      
      return hideSensitive ? this.hideSensitiveValues(settings) : settings;
    } catch (error) {
      console.error(`Get settings by category (${category}) error:`, error.message);
      throw error;
    }
  }
  
  /**
   * Get a setting by id
   * @param {string} id - The setting id
   * @param {boolean} hideSensitive - Whether to hide sensitive setting value
   * @param {number} userId - Optional user ID to get user-specific setting
   * @returns {Promise<Object>} - The setting object
   */
  async getSettingById(id, hideSensitive = true, userId = null) {
    try {
      // If userId is provided, get user-specific setting
      if (userId) {
        return this.getUserSettingById(id, userId, hideSensitive);
      }
      
      // Try to get from cache if it's valid
      if (this.isCacheValid() && this.cache.has(id)) {
        const setting = this.cache.get(id);
        return hideSensitive && setting.is_sensitive ? { ...setting, value: '********' } : setting;
      }
      
      // Get from database
      const setting = await db.get('SELECT * FROM settings WHERE id = ?', [id]);
      
      if (!setting) {
        throw new Error(`Setting with id ${id} not found`);
      }
      
      return hideSensitive && setting.is_sensitive ? { ...setting, value: '********' } : setting;
    } catch (error) {
      console.error(`Get setting by id (${id}) error:`, error.message);
      throw error;
    }
  }
  
  /**
   * Get a user-specific setting by id, falling back to global setting if not found
   * @param {string} id - The setting id
   * @param {number} userId - The user ID
   * @param {boolean} hideSensitive - Whether to hide sensitive setting value
   * @returns {Promise<Object>} - The setting object
   */
  async getUserSettingById(id, userId, hideSensitive = true) {
    try {
      // Try to get from user cache if it's valid
      if (this.isUserCacheValid(userId)) {
        const userSettings = this.userCache.get(userId);
        const setting = userSettings.find(s => s.id === id);
        if (setting) {
          return hideSensitive && setting.is_sensitive ? { ...setting, value: '********' } : setting;
        }
      }
      
      // Check if user has a custom setting
      const userSetting = await db.get(
        `SELECT us.user_id, us.setting_id, us.value, us.updated_at, 
                s.id, s.name, s.category, s.description, s.is_sensitive 
         FROM user_settings us 
         JOIN settings s ON us.setting_id = s.id 
         WHERE us.setting_id = ? AND us.user_id = ?`,
        [id, userId]
      );
      
      if (userSetting) {
        const formattedSetting = {
          id: userSetting.setting_id,
          name: userSetting.name,
          value: userSetting.value,
          category: userSetting.category,
          description: userSetting.description,
          is_sensitive: userSetting.is_sensitive,
          updated_at: userSetting.updated_at,
          user_id: userSetting.user_id
        };
        
        return hideSensitive && formattedSetting.is_sensitive ? 
          { ...formattedSetting, value: '********' } : 
          formattedSetting;
      }
      
      // Fallback to global setting
      return this.getSettingById(id, hideSensitive);
    } catch (error) {
      console.error(`Get user setting by id (${id}) for user ${userId} error:`, error.message);
      throw error;
    }
  }
  
  /**
   * Get a setting value by id
   * @param {string} id - The setting id
   * @param {number} userId - Optional user ID to get user-specific setting
   * @returns {Promise<string>} - The setting value
   */
  async getSettingValue(id, userId = null) {
    try {
      // If userId is provided, get user-specific setting value
      if (userId) {
        return this.getUserSettingValue(id, userId);
      }
      
      // Try to get from cache if it's valid
      if (this.isCacheValid() && this.cache.has(id)) {
        return this.cache.get(id).value;
      }
      
      // Get from database
      const setting = await db.get('SELECT value FROM settings WHERE id = ?', [id]);
      
      if (!setting) {
        throw new Error(`Setting with id ${id} not found`);
      }
      
      return setting.value;
    } catch (error) {
      console.error(`Get setting value (${id}) error:`, error.message);
      throw error;
    }
  }
  
  /**
   * Get a user-specific setting value by id, falling back to global setting if not found
   * @param {string} id - The setting id
   * @param {number} userId - The user ID
   * @returns {Promise<string>} - The setting value
   */
  async getUserSettingValue(id, userId) {
    try {
      // Check if user has a custom setting
      const userSetting = await db.get(
        'SELECT value FROM user_settings WHERE setting_id = ? AND user_id = ?',
        [id, userId]
      );
      
      if (userSetting) {
        return userSetting.value;
      }
      
      // Fallback to global setting
      return this.getSettingValue(id);
    } catch (error) {
      console.error(`Get user setting value (${id}) for user ${userId} error:`, error.message);
      throw error;
    }
  }
  
  /**
   * Update a setting by id
   * @param {string} id - The setting id
   * @param {string} value - The new setting value
   * @param {number} userId - Optional user ID to update user-specific setting
   * @returns {Promise<Object>} - The updated setting
   */
  async updateSetting(id, value, userId = null) {
    try {
      // If userId is provided, update user-specific setting
      if (userId) {
        return this.updateUserSetting(id, value, userId);
      }
      
      // Check if setting exists
      const setting = await db.get('SELECT id FROM settings WHERE id = ?', [id]);
      
      if (!setting) {
        throw new Error(`Setting with id ${id} not found`);
      }
      
      // Update setting
      await db.run(
        'UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [value, id]
      );
      
      // Invalidate cache
      this.invalidateCache();
      this.invalidateAllUserCaches();
      
      // Return updated setting
      return this.getSettingById(id, false);
    } catch (error) {
      console.error(`Update setting (${id}) error:`, error.message);
      throw error;
    }
  }
  
  /**
   * Update or create a user-specific setting
   * @param {string} id - The setting id
   * @param {string} value - The new setting value
   * @param {number} userId - The user ID
   * @returns {Promise<Object>} - The updated setting
   */
  async updateUserSetting(id, value, userId) {
    try {
      // Check if global setting exists
      const setting = await db.get('SELECT id FROM settings WHERE id = ?', [id]);
      
      if (!setting) {
        throw new Error(`Setting with id ${id} not found`);
      }
      
      // Check if user setting already exists
      const userSetting = await db.get(
        'SELECT id FROM user_settings WHERE setting_id = ? AND user_id = ?',
        [id, userId]
      );
      
      if (userSetting) {
        // Update existing user setting
        await db.run(
          'UPDATE user_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_id = ? AND user_id = ?',
          [value, id, userId]
        );
      } else {
        // Create new user setting
        await db.run(
          'INSERT INTO user_settings (user_id, setting_id, value) VALUES (?, ?, ?)',
          [userId, id, value]
        );
      }
      
      // Invalidate user cache
      this.invalidateUserCache(userId);
      
      // Return updated setting
      return this.getUserSettingById(id, userId, false);
    } catch (error) {
      console.error(`Update user setting (${id}) for user ${userId} error:`, error.message);
      throw error;
    }
  }
  
  /**
   * Update multiple settings at once
   * @param {Array} settings - Array of {id, value} objects
   * @param {number} userId - Optional user ID to update user-specific settings
   * @returns {Promise<Object>} - Result of the update operation
   */
  async updateSettings(settings, userId = null) {
    try {
      // If userId is provided, update user-specific settings
      if (userId) {
        return this.updateUserSettings(settings, userId);
      }
      
      // Start a transaction
      await db.run('BEGIN TRANSACTION');
      
      for (const setting of settings) {
        const { id, value } = setting;
        
        // Check if setting exists
        const existingSetting = await db.get('SELECT id FROM settings WHERE id = ?', [id]);
        
        if (!existingSetting) {
          throw new Error(`Setting with id ${id} not found`);
        }
        
        // Update setting
        await db.run(
          'UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [value, id]
        );
      }
      
      // Commit the transaction
      await db.run('COMMIT');
      
      // Invalidate cache
      this.invalidateCache();
      this.invalidateAllUserCaches();
      
      return { success: true, message: 'Settings updated successfully' };
    } catch (error) {
      // Rollback the transaction on error
      await db.run('ROLLBACK');
      
      console.error('Update settings error:', error.message);
      throw error;
    }
  }
  
  /**
   * Update multiple user-specific settings at once
   * @param {Array} settings - Array of {id, value} objects
   * @param {number} userId - The user ID
   * @returns {Promise<Object>} - Result of the update operation
   */
  async updateUserSettings(settings, userId) {
    try {
      // Start a transaction
      await db.run('BEGIN TRANSACTION');
      
      for (const setting of settings) {
        const { id, value } = setting;
        
        // Check if global setting exists
        const existingSetting = await db.get('SELECT id FROM settings WHERE id = ?', [id]);
        
        if (!existingSetting) {
          throw new Error(`Setting with id ${id} not found`);
        }
        
        // Check if user setting already exists
        const userSetting = await db.get(
          'SELECT id FROM user_settings WHERE setting_id = ? AND user_id = ?',
          [id, userId]
        );
        
        if (userSetting) {
          // Update existing user setting
          await db.run(
            'UPDATE user_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_id = ? AND user_id = ?',
            [value, id, userId]
          );
        } else {
          // Create new user setting
          await db.run(
            'INSERT INTO user_settings (user_id, setting_id, value) VALUES (?, ?, ?)',
            [userId, id, value]
          );
        }
      }
      
      // Commit the transaction
      await db.run('COMMIT');
      
      // Invalidate user cache
      this.invalidateUserCache(userId);
      
      return { success: true, message: 'User settings updated successfully' };
    } catch (error) {
      // Rollback the transaction on error
      await db.run('ROLLBACK');
      
      console.error(`Update user settings for user ${userId} error:`, error.message);
      throw error;
    }
  }
  
  /**
   * Reset settings to defaults
   * @param {number} userId - Optional user ID to reset only user-specific settings
   * @returns {Promise<Object>} - Result of the reset operation
   */
  async resetSettings(userId = null) {
    try {
      console.log('Starting settings reset process');
      
      // If userId is provided, only reset user-specific settings
      if (userId) {
        return this.resetUserSettings(userId);
      }
      
      // Drop and recreate the settings table
      await db.run('DROP TABLE IF EXISTS settings');
      console.log('Dropped settings table');
      
      await db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          value TEXT NOT NULL,
          category TEXT NOT NULL,
          description TEXT,
          is_sensitive BOOLEAN DEFAULT 0,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Created new settings table');
      
      // Drop and recreate user_settings table
      await db.run('DROP TABLE IF EXISTS user_settings');
      console.log('Dropped user_settings table');
      
      await db.run(`
        CREATE TABLE IF NOT EXISTS user_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          setting_id TEXT NOT NULL,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY (setting_id) REFERENCES settings (id) ON DELETE CASCADE,
          UNIQUE(user_id, setting_id)
        )
      `);
      console.log('Created new user_settings table');
      
      // Import the insertDefaultSettings function directly
      const { insertDefaultSettings } = require('../db/migration');
      
      // Call insertDefaultSettings directly
      await insertDefaultSettings();
      console.log('Default settings inserted');
      
      // Invalidate all caches
      this.invalidateCache();
      this.invalidateAllUserCaches();
      
      return { success: true, message: 'All settings reset to defaults' };
    } catch (error) {
      console.error('Reset settings error:', error.message);
      throw error;
    }
  }
  
  /**
   * Reset user-specific settings for a user
   * @param {number} userId - The user ID
   * @returns {Promise<Object>} - Result of the reset operation
   */
  async resetUserSettings(userId) {
    try {
      console.log(`Resetting user settings for user ${userId}`);
      
      // Delete all user-specific settings
      await db.run('DELETE FROM user_settings WHERE user_id = ?', [userId]);
      console.log(`Deleted all settings for user ${userId}`);
      
      // Invalidate user cache
      this.invalidateUserCache(userId);
      
      return { success: true, message: `User settings reset to global defaults for user ${userId}` };
    } catch (error) {
      console.error(`Reset user settings for user ${userId} error:`, error.message);
      throw error;
    }
  }
  
  /**
   * Hide sensitive values in settings array
   * @param {Array} settings - Array of settings
   * @returns {Array} - Array of settings with sensitive values hidden
   * @private
   */
  hideSensitiveValues(settings) {
    return settings.map(setting => {
      if (setting.is_sensitive && setting.value) {
        return { ...setting, value: '********' };
      }
      return setting;
    });
  }
  
  /**
   * Check if the cache is valid
   * @returns {boolean} - Whether the cache is valid
   * @private
   */
  isCacheValid() {
    return this.cache.size > 0 && this.cacheExpiry && this.cacheExpiry > Date.now();
  }
  
  /**
   * Check if the user cache is valid
   * @param {number} userId - The user ID
   * @returns {boolean} - Whether the user cache is valid
   * @private
   */
  isUserCacheValid(userId) {
    return this.userCache.has(userId) && 
           this.userCacheExpiry.has(userId) && 
           this.userCacheExpiry.get(userId) > Date.now();
  }
  
  /**
   * Update the settings cache
   * @param {Array} settings - Array of settings to cache
   * @private
   */
  updateCache(settings) {
    this.cache.clear();
    settings.forEach(setting => {
      this.cache.set(setting.id, setting);
    });
    this.cacheExpiry = Date.now() + this.CACHE_TTL;
  }
  
  /**
   * Update the user settings cache
   * @param {number} userId - The user ID
   * @param {Array} settings - Array of settings to cache
   * @private
   */
  updateUserCache(userId, settings) {
    this.userCache.set(userId, settings);
    this.userCacheExpiry.set(userId, Date.now() + this.CACHE_TTL);
  }
  
  /**
   * Invalidate the cache
   * @private
   */
  invalidateCache() {
    this.cache.clear();
    this.cacheExpiry = null;
  }
  
  /**
   * Invalidate a user's cache
   * @param {number} userId - The user ID
   * @private
   */
  invalidateUserCache(userId) {
    this.userCache.delete(userId);
    this.userCacheExpiry.delete(userId);
  }
  
  /**
   * Invalidate all user caches
   * @private
   */
  invalidateAllUserCaches() {
    this.userCache.clear();
    this.userCacheExpiry.clear();
  }
}

module.exports = new SettingsService();
