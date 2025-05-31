const express = require('express');
const router = express.Router();
const { Client } = require('ssh2');
const { authenticateToken } = require('../middleware/authMiddleware');

// Protect all routes with authentication
router.use(authenticateToken);

/**
 * Debug SSH connection test
 * Tests SSH connection with private key and optional passphrase
 * POST /api/ssh/debug-test
 */
router.post('/debug-test', async (req, res) => {
  const { hostname, port, username, privateKey, keyPassphrase } = req.body;

  if (!hostname || !username || !privateKey) {
    return res.status(400).json({
      success: false,
      message: 'Hostname, username, and private key are required'
    });
  }

  try {
    const result = await testSshConnection(hostname, port, username, privateKey, keyPassphrase);
    return res.json(result);
  } catch (error) {
    console.error('SSH debug test error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'SSH connection failed',
      details: error.stack
    });
  }
});

/**
 * Test SSH connection with private key
 */
async function testSshConnection(hostname, port, username, privateKey, keyPassphrase) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let connectionTimeout = setTimeout(() => {
      conn.end();
      reject(new Error('Connection timeout after 15 seconds'));
    }, 15000);

    conn.on('ready', () => {
      clearTimeout(connectionTimeout);
      conn.end();
      resolve({
        success: true,
        message: `Successfully connected to ${username}@${hostname}:${port}`
      });
    });

    conn.on('error', (err) => {
      clearTimeout(connectionTimeout);
      conn.end();
      reject(err);
    });

    // Prepare connection options
    const connectOptions = {
      host: hostname,
      port: port || 22,
      username: username,
      readyTimeout: 10000
    };

    // Add private key with optional passphrase
    connectOptions.privateKey = privateKey;
    if (keyPassphrase) {
      connectOptions.passphrase = keyPassphrase;
    }

    // Attempt connection
    console.log(`Connecting to ${username}@${hostname}:${port || 22}...`);
    console.log('Using private key:', privateKey ? 'Yes' : 'No');
    console.log('Using passphrase:', keyPassphrase ? 'Yes' : 'No');
    console.log('Connection options:', connectOptions);
    conn.connect(connectOptions);
  });
}

module.exports = router;
