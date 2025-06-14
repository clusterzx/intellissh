const crypto = require('crypto');
const settingsService = require('./settingsService');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.key = null;
    this.initialized = false;
  }
  
  async init() {
    try {
      if (this.initialized && this.key) return;

      await this.loadEncryptionKey();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Encryption Service:', error);
      // Fall back to environment variable or generate a random key
      this.key = this.getFallbackEncryptionKey();
      // Mark as initialized even when falling back so we don't retry on every call
      this.initialized = true;
    }
  }
  
  async loadEncryptionKey() {
    try {
      // Get encryption key from database settings
      const keyFromSettings = await settingsService.getSettingValue('encryption_key');
      
      if (!keyFromSettings) {
        throw new Error('No encryption key found in settings');
      }
      
      // Convert hex string to buffer
      if (keyFromSettings.length === 64) {
        this.key = Buffer.from(keyFromSettings, 'hex');
      } else {
        // If not hex, use SHA-256 hash of the string
        this.key = crypto.createHash('sha256').update(keyFromSettings).digest();
      }
    } catch (error) {
      console.error('Error loading encryption key from settings:', error);
      throw error;
    }
  }
  
  getFallbackEncryptionKey() {
    // Try to get from environment variable
    const keyFromEnv = process.env.ENCRYPTION_KEY;
    
    if (!keyFromEnv) {
      // Generate a random key for development (not recommended for production)
      console.warn('No encryption key found in settings or environment. Generating random key for development.');
      return crypto.randomBytes(32);
    }
    
    // Convert hex string to buffer
    if (keyFromEnv.length === 64) {
      return Buffer.from(keyFromEnv, 'hex');
    }
    
    // If not hex, use SHA-256 hash of the string
    return crypto.createHash('sha256').update(keyFromEnv).digest();
  }

  encrypt(text) {
    if (!text) return { encryptedData: null, iv: null };
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted
    };
  }

  decrypt(encryptedData, iv) {
    if (!encryptedData || !iv) return null;
    
    try {
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.key,
        Buffer.from(iv, 'hex')
      );
      
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error.message);
      return null;
    }
  }

  // Generate a secure random encryption key
  static generateKey() {
    return crypto.randomBytes(32).toString('hex');
  }
}

module.exports = new EncryptionService();
