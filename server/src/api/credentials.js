const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const credentialService = require('../services/credentialService');

// Create a new credential
router.post('/', authenticateToken, async (req, res) => {
  const { name, type, username, password, privateKey, passphrase } = req.body;
  const userId = req.user.id;

  if (!name || !type) {
    return res.status(400).json({ message: 'Name and type are required.' });
  }

  if (type === credentialService.CREDENTIAL_TYPES.PASSWORD && !password) {
    return res.status(400).json({ message: 'Password is required for password type credentials.' });
  }

  if (type === credentialService.CREDENTIAL_TYPES.PRIVATE_KEY && !privateKey) {
    return res.status(400).json({ message: 'Private key is required for private key type credentials.' });
  }

  try {
    const credential = await credentialService.createCredential(
      userId, name, type, username, password, privateKey, passphrase
    );
    res.status(201).json(credential);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all credentials for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const credentials = await credentialService.getCredentialsByUserId(userId);
    res.json(credentials);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single credential by ID (for editing/viewing details)
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const credential = await credentialService.getCredentialById(id, userId);
    if (!credential) {
      return res.status(404).json({ message: 'Credential not found.' });
    }
    res.json(credential);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a credential
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, type, username, password, privateKey, passphrase } = req.body;
  const userId = req.user.id;

  if (!name || !type) {
    return res.status(400).json({ message: 'Name and type are required.' });
  }

  try {
    const updatedCredential = await credentialService.updateCredential(
      id, userId, name, type, username, password, privateKey, passphrase
    );
    res.json(updatedCredential);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a credential
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    await credentialService.deleteCredential(id, userId);
    res.status(204).send(); // No content on successful deletion
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
