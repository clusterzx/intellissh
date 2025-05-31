const db = require('../db/database');
const encryptionService = require('./encryptionService');

class SessionService {
  constructor() {
    this.encryptionService = encryptionService;
    this.initialized = false;
  }
  
  async init() {
    if (this.initialized) return;
    
    // Initialize encryption service
    await this.encryptionService.init();
    this.initialized = true;
  }

  async createSession(userId, sessionData) {
    try {
      const { name, hostname, port, username, password, privateKey, keyPassphrase } = sessionData;

      // Encrypt sensitive data
      let encryptedPassword = null;
      let encryptedPrivateKey = null;
      let iv = null;

      if (password) {
        const encrypted = this.encryptionService.encrypt(password);
        encryptedPassword = encrypted.encryptedData;
        iv = encrypted.iv;
      }

      if (privateKey) {
        const encrypted = this.encryptionService.encrypt(privateKey);
        encryptedPrivateKey = encrypted.encryptedData;
        if (!iv) iv = encrypted.iv;
      }

      const result = await db.run(
        `INSERT INTO sessions (user_id, name, hostname, port, username, password, private_key, key_passphrase, iv, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [userId, name, hostname, port || 22, username, encryptedPassword, encryptedPrivateKey, keyPassphrase, iv]
      );

      return await this.getSessionById(result.id, userId);
    } catch (error) {
      console.error('Create session error:', error.message);
      throw error;
    }
  }

  async getSessionsByUserId(userId) {
    try {
      const sessions = await db.all(
        'SELECT id, name, hostname, port, username, console_snapshot, created_at, updated_at FROM sessions WHERE user_id = ? ORDER BY updated_at DESC',
        [userId]
      );

      return sessions;
    } catch (error) {
      console.error('Get sessions error:', error.message);
      throw error;
    }
  }

  async getSessionById(sessionId, userId) {
    try {
      const session = await db.get(
        'SELECT * FROM sessions WHERE id = ? AND user_id = ?',
        [sessionId, userId]
      );

      if (!session) {
        throw new Error('Session not found');
      }

      // Return session without sensitive data for security
      return {
        id: session.id,
        name: session.name,
        hostname: session.hostname,
        port: session.port,
        username: session.username,
        hasPassword: !!session.password,
        hasPrivateKey: !!session.private_key,
        consoleSnapshot: session.console_snapshot,
        created_at: session.created_at,
        updated_at: session.updated_at
      };
    } catch (error) {
      console.error('Get session error:', error.message);
      throw error;
    }
  }

  async getSessionWithCredentials(sessionId, userId) {
    try {
      const session = await db.get(
        'SELECT * FROM sessions WHERE id = ? AND user_id = ?',
        [sessionId, userId]
      );

      if (!session) {
        throw new Error('Session not found');
      }

      // Decrypt sensitive data
      let password = null;
      let privateKey = null;

      if (session.password && session.iv) {
        password = this.encryptionService.decrypt(session.password, session.iv);
      }

      if (session.private_key && session.iv) {
        privateKey = this.encryptionService.decrypt(session.private_key, session.iv);
      }

      return {
        id: session.id,
        name: session.name,
        hostname: session.hostname,
        port: session.port,
        username: session.username,
        password,
        privateKey,
        keyPassphrase: session.key_passphrase,
        consoleSnapshot: session.console_snapshot,
        created_at: session.created_at,
        updated_at: session.updated_at
      };
    } catch (error) {
      console.error('Get session with credentials error:', error.message);
      throw error;
    }
  }

  async updateSession(sessionId, userId, updateData) {
    try {
      const { name, hostname, port, username, password, privateKey, keyPassphrase, consoleSnapshot } = updateData;

      // Get existing session
      const existingSession = await db.get(
        'SELECT * FROM sessions WHERE id = ? AND user_id = ?',
        [sessionId, userId]
      );

      if (!existingSession) {
        throw new Error('Session not found');
      }

      // Prepare update data
      let encryptedPassword = existingSession.password;
      let encryptedPrivateKey = existingSession.private_key;
      let iv = existingSession.iv;
      let updatedKeyPassphrase = existingSession.key_passphrase;

      // Update password if provided
      if (password !== undefined) {
        if (password) {
          const encrypted = this.encryptionService.encrypt(password);
          encryptedPassword = encrypted.encryptedData;
          iv = encrypted.iv;
        } else {
          encryptedPassword = null;
        }
      }

      // Update private key if provided
      if (privateKey !== undefined) {
        if (privateKey) {
          const encrypted = this.encryptionService.encrypt(privateKey);
          encryptedPrivateKey = encrypted.encryptedData;
          if (!iv) iv = encrypted.iv;
        } else {
          encryptedPrivateKey = null;
        }
      }

      // Update key passphrase if provided
      if (keyPassphrase !== undefined) {
        updatedKeyPassphrase = keyPassphrase;
      }

      // Include console snapshot if provided
      let updatedConsoleSnapshot = existingSession.console_snapshot;
      if (consoleSnapshot !== undefined) {
        updatedConsoleSnapshot = consoleSnapshot;
      }
      
      await db.run(
        `UPDATE sessions 
         SET name = ?, hostname = ?, port = ?, username = ?, password = ?, private_key = ?, key_passphrase = ?, iv = ?, console_snapshot = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [name, hostname, port || 22, username, encryptedPassword, encryptedPrivateKey, updatedKeyPassphrase, iv, updatedConsoleSnapshot, sessionId, userId]
      );

      return await this.getSessionById(sessionId, userId);
    } catch (error) {
      console.error('Update session error:', error.message);
      throw error;
    }
  }

  async deleteSession(sessionId, userId) {
    try {
      const result = await db.run(
        'DELETE FROM sessions WHERE id = ? AND user_id = ?',
        [sessionId, userId]
      );

      if (result.changes === 0) {
        throw new Error('Session not found');
      }

      return { message: 'Session deleted successfully' };
    } catch (error) {
      console.error('Delete session error:', error.message);
      throw error;
    }
  }

  async duplicateSession(sessionId, userId, newName) {
    try {
      const session = await this.getSessionWithCredentials(sessionId, userId);
      
      if (!session) {
        throw new Error('Session not found');
      }

      const duplicatedSession = {
        name: newName || `${session.name} (Copy)`,
        hostname: session.hostname,
        port: session.port,
        username: session.username,
        password: session.password,
        privateKey: session.privateKey,
        keyPassphrase: session.keyPassphrase
      };

      return await this.createSession(userId, duplicatedSession);
    } catch (error) {
      console.error('Duplicate session error:', error.message);
      throw error;
    }
  }

  async saveConsoleSnapshot(sessionId, userId, snapshotData) {
    try {
      // Check if session exists
      const session = await db.get(
        'SELECT id FROM sessions WHERE id = ? AND user_id = ?',
        [sessionId, userId]
      );

      if (!session) {
        throw new Error('Session not found');
      }

      // Update only the console_snapshot field
      await db.run(
        `UPDATE sessions 
         SET console_snapshot = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [snapshotData, sessionId, userId]
      );

      return { success: true, message: 'Console snapshot saved successfully' };
    } catch (error) {
      console.error('Save console snapshot error:', error.message);
      throw error;
    }
  }

  async validateSessionData(sessionData) {
    const { name, hostname, username } = sessionData;
    const errors = [];

    if (!name || name.trim().length === 0) {
      errors.push('Session name is required');
    }

    if (!hostname || hostname.trim().length === 0) {
      errors.push('Hostname is required');
    }

    if (!username || username.trim().length === 0) {
      errors.push('Username is required');
    }

    if (sessionData.port && (isNaN(sessionData.port) || sessionData.port < 1 || sessionData.port > 65535)) {
      errors.push('Port must be a valid number between 1 and 65535');
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    return true;
  }
}

module.exports = new SessionService();
