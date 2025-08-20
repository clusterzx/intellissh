const db = require('../db/database');
const encryptionService = require('./encryptionService');
const credentialService = require('./credentialService');

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
      const { name, hostname, port, username, password, privateKey, keyPassphrase, credentialId } = sessionData;

      let finalUsername = username;
      let encryptedPassword = null;
      let encryptedPrivateKey = null;
      let finalKeyPassphrase = keyPassphrase;
      let iv = null;

      if (credentialId) {
        const credential = await credentialService.getCredentialById(credentialId, userId);
        if (!credential) {
          throw new Error('Referenced credential not found.');
        }
        finalUsername = credential.username;
        if (credential.type === credentialService.CREDENTIAL_TYPES.PASSWORD) {
          const encrypted = this.encryptionService.encrypt(credential.password);
          encryptedPassword = encrypted.encryptedData;
          iv = encrypted.iv;
        } else if (credential.type === credentialService.CREDENTIAL_TYPES.PRIVATE_KEY) {
          const encrypted = this.encryptionService.encrypt(credential.private_key);
          encryptedPrivateKey = encrypted.encryptedData;
          iv = encrypted.iv;
          finalKeyPassphrase = credential.passphrase;
        }
      } else {
        // Use directly provided credentials if no credentialId
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
      }

      const result = await db.run(
        `INSERT INTO sessions (user_id, name, hostname, port, username, password, private_key, key_passphrase, iv, credential_id, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [userId, name, hostname, port || 22, finalUsername, encryptedPassword, encryptedPrivateKey, finalKeyPassphrase, iv, credentialId]
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
        'SELECT id, name, hostname, port, username, console_snapshot, created_at, updated_at, credential_id FROM sessions WHERE user_id = ? ORDER BY updated_at DESC',
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
        'SELECT id, name, hostname, port, username, console_snapshot, created_at, updated_at, credential_id FROM sessions WHERE id = ? AND user_id = ?',
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
        updated_at: session.updated_at,
        credentialId: session.credential_id
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

      let password = null;
      let privateKey = null;
      let keyPassphrase = session.key_passphrase;
      let username = session.username;

      console.log(`[SessionService] getSessionWithCredentials for session ${sessionId}. Credential ID: ${session.credential_id}`);

      if (session.credential_id) {
        const credential = await credentialService.getCredentialById(session.credential_id, userId);
        if (!credential) {
          console.warn(`[SessionService] Credential with ID ${session.credential_id} not found for session ${sessionId}. Falling back to direct credentials.`);
          if (session.password && session.iv) {
            password = this.encryptionService.decrypt(session.password, session.iv);
          }
          if (session.private_key && session.iv) {
            privateKey = this.encryptionService.decrypt(session.private_key, session.iv);
          }
        } else {
          username = credential.username;
          if (credential.type === credentialService.CREDENTIAL_TYPES.PASSWORD) {
            password = credential.password;
            console.log(`[SessionService] Using password credential for user: ${username}`);
          } else if (credential.type === credentialService.CREDENTIAL_TYPES.PRIVATE_KEY) {
            privateKey = credential.private_key;
            keyPassphrase = credential.passphrase;
            console.log(`[SessionService] Using private key credential for user: ${username}. Key length: ${privateKey ? privateKey.length : 0}`);
          }
        }
      } else {
        console.log(`[SessionService] No credential ID. Using direct session credentials.`);
        // Decrypt sensitive data if no credential_id is linked
        if (session.password && session.iv) {
          password = this.encryptionService.decrypt(session.password, session.iv);
          console.log(`[SessionService] Direct password found.`);
        }
        if (session.private_key && session.iv) {
          privateKey = this.encryptionService.decrypt(session.private_key, session.iv);
          console.log(`[SessionService] Direct private key found. Key length: ${privateKey ? privateKey.length : 0}`);
        }
      }

      return {
        id: session.id,
        name: session.name,
        hostname: session.hostname,
        port: session.port,
        username: username,
        password,
        privateKey,
        keyPassphrase: keyPassphrase,
        consoleSnapshot: session.console_snapshot,
        created_at: session.created_at,
        updated_at: session.updated_at,
        credentialId: session.credential_id
      };
    } catch (error) {
      console.error('Get session with credentials error:', error.message);
      throw error;
    }
  }

  async updateSession(sessionId, userId, updateData) {
    try {
      const { name, hostname, port, username, password, privateKey, keyPassphrase, consoleSnapshot, credentialId } = updateData;

      // Get existing session
      const existingSession = await db.get(
        'SELECT * FROM sessions WHERE id = ? AND user_id = ?',
        [sessionId, userId]
      );

      if (!existingSession) {
        throw new Error('Session not found');
      }

      // Prepare update data
      let finalUsername = username !== undefined ? username : existingSession.username;
      let encryptedPassword = existingSession.password;
      let encryptedPrivateKey = existingSession.private_key;
      let iv = existingSession.iv;
      let finalKeyPassphrase = keyPassphrase !== undefined ? keyPassphrase : existingSession.key_passphrase;
      let finalCredentialId = credentialId !== undefined ? credentialId : existingSession.credential_id;

      // If credentialId is explicitly set to null or a new ID, clear direct credentials
      if (credentialId !== undefined) {
        if (credentialId === null) {
          encryptedPassword = null;
          encryptedPrivateKey = null;
          finalKeyPassphrase = null;
          iv = null;
        } else if (credentialId !== existingSession.credential_id) {
          // If a new credentialId is provided, fetch and use its details
          const credential = await credentialService.getCredentialById(credentialId, userId);
          if (!credential) {
            throw new Error('Referenced credential not found.');
          }
          finalUsername = credential.username;
          if (credential.type === credentialService.CREDENTIAL_TYPES.PASSWORD) {
            const encrypted = this.encryptionService.encrypt(credential.password);
            encryptedPassword = encrypted.encryptedData;
            iv = encrypted.iv;
            encryptedPrivateKey = null; // Clear private key if switching to password credential
            finalKeyPassphrase = null;
          } else if (credential.type === credentialService.CREDENTIAL_TYPES.PRIVATE_KEY) {
            const encrypted = this.encryptionService.encrypt(credential.private_key);
            encryptedPrivateKey = encrypted.encryptedData;
            iv = encrypted.iv;
            finalKeyPassphrase = credential.passphrase;
            encryptedPassword = null; // Clear password if switching to private key credential
          }
        }
      } else if (credentialId === undefined && (password !== undefined || privateKey !== undefined)) {
        // If credentialId is not changed, but direct credentials are provided, clear credentialId
        finalCredentialId = null;
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
      }

      // Include console snapshot if provided
      let updatedConsoleSnapshot = existingSession.console_snapshot;
      if (consoleSnapshot !== undefined) {
        updatedConsoleSnapshot = consoleSnapshot;
      }
      
      await db.run(
        `UPDATE sessions 
         SET name = ?, hostname = ?, port = ?, username = ?, password = ?, private_key = ?, key_passphrase = ?, iv = ?, console_snapshot = ?, credential_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [name, hostname, port || 22, finalUsername, encryptedPassword, encryptedPrivateKey, finalKeyPassphrase, iv, updatedConsoleSnapshot, finalCredentialId, sessionId, userId]
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
        keyPassphrase: session.keyPassphrase,
        credentialId: session.credentialId
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
