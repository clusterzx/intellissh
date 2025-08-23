const db = require('../db/database');
const encryptionService = require('./encryptionService');

const CREDENTIAL_TYPES = {
  PASSWORD: 'password',
  PRIVATE_KEY: 'private_key',
};

async function createCredential(userId, name, type, username, password, privateKey, passphrase) {
  // Encrypt sensitive data
  let encryptedPassword = null;
  let encryptedPrivateKey = null;
  let encryptedPassphrase = null;
  let iv = null;

  if (type === CREDENTIAL_TYPES.PASSWORD && password) {
    const encrypted = encryptionService.encrypt(password);
    encryptedPassword = encrypted.encryptedData;
    iv = encrypted.iv;
  } else if (type === CREDENTIAL_TYPES.PRIVATE_KEY && privateKey) {
    const encrypted = encryptionService.encrypt(privateKey);
    encryptedPrivateKey = encrypted.encryptedData;
    iv = encrypted.iv;
    if (passphrase) {
      const encryptedPassphraseData = encryptionService.encrypt(passphrase, iv);
      encryptedPassphrase = encryptedPassphraseData.encryptedData;
    }
  }

  const sql = `
    INSERT INTO credentials (user_id, name, type, username, password, private_key, passphrase, iv)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    userId, name, type, username,
    encryptedPassword, encryptedPrivateKey, encryptedPassphrase, iv
  ];

  try {
    const result = await db.run(sql, params);
    return { id: result.id, name, type, username }; // Return basic info, not sensitive data
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed: credentials.user_id, credentials.name')) {
      throw new Error('A credential with this name already exists for this user.');
    }
    throw new Error(`Failed to create credential: ${error.message}`);
  }
}

async function getCredentialsByUserId(userId) {
  const sql = 'SELECT id, name, type, username, created_at, updated_at FROM credentials WHERE user_id = ?';
  try {
    const credentials = await db.all(sql, [userId]);
    return credentials;
  } catch (error) {
    throw new Error(`Failed to retrieve credentials: ${error.message}`);
  }
}

async function getCredentialById(credentialId, userId) {
  const sql = 'SELECT * FROM credentials WHERE id = ? AND user_id = ?';
  try {
    const credential = await db.get(sql, [credentialId, userId]);
    if (!credential) {
      return null;
    }

    // Decrypt sensitive data before returning
    if (credential.type === CREDENTIAL_TYPES.PASSWORD && credential.password) {
      credential.password = encryptionService.decrypt(credential.password, credential.iv);
    } else if (credential.type === CREDENTIAL_TYPES.PRIVATE_KEY && credential.private_key) {
      credential.private_key = encryptionService.decrypt(credential.private_key, credential.iv);
      if (credential.passphrase) {
        credential.passphrase = encryptionService.decrypt(credential.passphrase, credential.iv);
      }
    }
    return credential;
  } catch (error) {
    throw new Error(`Failed to retrieve credential: ${error.message}`);
  }
}

async function updateCredential(credentialId, userId, name, type, username, password, privateKey, passphrase) {
  // Fetch existing credential to get current IV if not provided for update
  const existingCredential = await db.get('SELECT iv FROM credentials WHERE id = ? AND user_id = ?', [credentialId, userId]);
  if (!existingCredential) {
    throw new Error('Credential not found or unauthorized.');
  }

  let encryptedPassword = null;
  let encryptedPrivateKey = null;
  let encryptedPassphrase = null;
  let iv = existingCredential.iv; // Use existing IV by default

  // Re-encrypt if sensitive data is provided for update
  if (type === CREDENTIAL_TYPES.PASSWORD && password !== undefined) {
    const encrypted = encryptionService.encrypt(password);
    encryptedPassword = encrypted.encryptedData;
    iv = encrypted.iv;
  } else if (type === CREDENTIAL_TYPES.PRIVATE_KEY && privateKey !== undefined) {
    const encrypted = encryptionService.encrypt(privateKey);
    encryptedPrivateKey = encrypted.encryptedData;
    iv = encrypted.iv;
    if (passphrase !== undefined) {
      const encryptedPassphraseData = encryptionService.encrypt(passphrase, iv);
      encryptedPassphrase = encryptedPassphraseData.encryptedData;
    }
  }

  const sql = `
    UPDATE credentials
    SET name = ?,
        type = ?,
        username = ?,
        password = ?,
        private_key = ?,
        passphrase = ?,
        iv = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `;
  const params = [
    name, type, username,
    encryptedPassword, encryptedPrivateKey, encryptedPassphrase, iv,
    credentialId, userId
  ];

  try {
    const result = await db.run(sql, params);
    if (result.changes === 0) {
      throw new Error('Credential not found or no changes made.');
    }
    return { id: credentialId, name, type, username };
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed: credentials.user_id, credentials.name')) {
      throw new Error('A credential with this name already exists for this user.');
    }
    throw new Error(`Failed to update credential: ${error.message}`);
  }
}

async function deleteCredential(credentialId, userId) {
  const sql = 'DELETE FROM credentials WHERE id = ? AND user_id = ?';
  try {
    const result = await db.run(sql, [credentialId, userId]);
    if (result.changes === 0) {
      throw new Error('Credential not found or unauthorized.');
    }
    return { message: 'Credential deleted successfully.' };
  } catch (error) {
    throw new Error(`Failed to delete credential: ${error.message}`);
  }
}

module.exports = {
  CREDENTIAL_TYPES,
  createCredential,
  getCredentialsByUserId,
  getCredentialById,
  updateCredential,
  deleteCredential,
};
