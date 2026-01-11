const express = require('express');
const sessionService = require('../services/sessionService');
const sshService = require('../services/sshService');
const tagService = require('../services/tagService');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// @route   GET /api/sessions
// @desc    Get all sessions for the authenticated user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { tagId } = req.query;
    const filter = {};

    if (tagId !== undefined) {
      const parsedTagId = parseInt(tagId, 10);

      if (Number.isNaN(parsedTagId) || parsedTagId <= 0) {
        return res.status(400).json({
          error: 'Invalid tag ID.'
        });
      }

      const tag = await tagService.getTagById(parsedTagId, req.user.id);
      if (!tag) {
        return res.status(404).json({
          error: 'Tag not found.'
        });
      }

      filter.tagId = parsedTagId;
    }

    const sessions = await sessionService.getSessionsByUserId(req.user.id, filter);

    res.json({
      success: true,
      sessions: sessions
    });
  } catch (error) {
    console.error('Get sessions error:', error.message);
    res.status(500).json({
      error: 'Internal server error while fetching sessions.'
    });
  }
});

// @route   GET /api/sessions/:id
// @desc    Get a specific session by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    
    if (isNaN(sessionId)) {
      return res.status(400).json({
        error: 'Invalid session ID.'
      });
    }

    const session = await sessionService.getSessionById(sessionId, req.user.id);

    res.json({
      success: true,
      session: session
    });
  } catch (error) {
    console.error('Get session error:', error.message);
    
    if (error.message === 'Session not found') {
      return res.status(404).json({
        error: 'Session not found.'
      });
    }

    res.status(500).json({
      error: 'Internal server error while fetching session.'
    });
  }
});

// @route   POST /api/sessions
// @desc    Create a new session
// @access  Private
router.post('/', async (req, res) => {
  try {
    // Initialize session service to ensure encryption key is loaded
    await sessionService.init();
    
    const sessionData = {
      name: req.body.name,
      hostname: req.body.hostname,
      port: req.body.port,
      username: req.body.username,
      password: req.body.password,
      privateKey: req.body.privateKey,
      keyPassphrase: req.body.keyPassphrase,
      credentialId: req.body.credentialId
    };

    if (req.body.tags !== undefined) {
      if (req.body.tags === null) {
        sessionData.tags = [];
      } else if (Array.isArray(req.body.tags)) {
        sessionData.tags = req.body.tags;
      } else {
        return res.status(400).json({
          error: 'Tags must be provided as an array.'
        });
      }
    }

    // Validate session data
    await sessionService.validateSessionData(sessionData);

    const session = await sessionService.createSession(req.user.id, sessionData);

    res.status(201).json({
      success: true,
      message: 'Session created successfully.',
      session: session
    });
  } catch (error) {
    console.error('Create session error:', error.message);
    
    if (error.message.includes('required') || error.message.includes('valid')) {
      return res.status(400).json({
        error: error.message
      });
    }

    res.status(500).json({
      error: 'Internal server error while creating session.'
    });
  }
});

// @route   PUT /api/sessions/:id
// @desc    Update a session
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    
    if (isNaN(sessionId)) {
      return res.status(400).json({
        error: 'Invalid session ID.'
      });
    }

    const updateData = {
      name: req.body.name,
      hostname: req.body.hostname,
      port: req.body.port,
      username: req.body.username,
      password: req.body.password,
      privateKey: req.body.privateKey,
      keyPassphrase: req.body.keyPassphrase,
      credentialId: req.body.credentialId
    };

    if (req.body.tags !== undefined) {
      if (req.body.tags === null) {
        updateData.tags = [];
      } else if (Array.isArray(req.body.tags)) {
        updateData.tags = req.body.tags;
      } else {
        return res.status(400).json({
          error: 'Tags must be provided as an array.'
        });
      }
    }

    // Validate session data
    await sessionService.validateSessionData(updateData);

    const session = await sessionService.updateSession(sessionId, req.user.id, updateData);

    res.json({
      success: true,
      message: 'Session updated successfully.',
      session: session
    });
  } catch (error) {
    console.error('Update session error:', error.message);
    
    if (error.message === 'Session not found') {
      return res.status(404).json({
        error: 'Session not found.'
      });
    }

    if (error.message.includes('required') || error.message.includes('valid')) {
      return res.status(400).json({
        error: error.message
      });
    }

    res.status(500).json({
      error: 'Internal server error while updating session.'
    });
  }
});

// @route   DELETE /api/sessions/:id
// @desc    Delete a session
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    
    if (isNaN(sessionId)) {
      return res.status(400).json({
        error: 'Invalid session ID.'
      });
    }

    const result = await sessionService.deleteSession(sessionId, req.user.id);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Delete session error:', error.message);
    
    if (error.message === 'Session not found') {
      return res.status(404).json({
        error: 'Session not found.'
      });
    }

    res.status(500).json({
      error: 'Internal server error while deleting session.'
    });
  }
});

// @route   POST /api/sessions/:id/duplicate
// @desc    Duplicate a session
// @access  Private
router.post('/:id/duplicate', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    
    if (isNaN(sessionId)) {
      return res.status(400).json({
        error: 'Invalid session ID.'
      });
    }

    const newName = req.body.name;
    const session = await sessionService.duplicateSession(sessionId, req.user.id, newName);

    res.status(201).json({
      success: true,
      message: 'Session duplicated successfully.',
      session: session
    });
  } catch (error) {
    console.error('Duplicate session error:', error.message);
    
    if (error.message === 'Session not found') {
      return res.status(404).json({
        error: 'Session not found.'
      });
    }

    res.status(500).json({
      error: 'Internal server error while duplicating session.'
    });
  }
});

// @route   POST /api/sessions/:id/snapshot
// @desc    Save console snapshot for a session
// @access  Private
router.post('/:id/snapshot', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    
    if (isNaN(sessionId)) {
      return res.status(400).json({
        error: 'Invalid session ID.'
      });
    }

    const { snapshot } = req.body;
    
    if (!snapshot) {
      return res.status(400).json({
        error: 'Console snapshot data is required.'
      });
    }

    const result = await sessionService.saveConsoleSnapshot(sessionId, req.user.id, snapshot);

    res.json({
      success: true,
      message: 'Console snapshot saved successfully'
    });
  } catch (error) {
    console.error('Save console snapshot error:', error.message);
    
    if (error.message === 'Session not found') {
      return res.status(404).json({
        error: 'Session not found.'
      });
    }

    res.status(500).json({
      error: 'Internal server error while saving console snapshot.'
    });
  }
});

// @route   POST /api/sessions/:id/test
// @desc    Test SSH connection for a session
// @access  Private
router.post('/:id/test', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    
    if (isNaN(sessionId)) {
      return res.status(400).json({
        error: 'Invalid session ID.'
      });
    }

    // Get session with credentials for testing
    const sessionData = await sessionService.getSessionWithCredentials(sessionId, req.user.id);
    
    // Test the connection
    const result = await sshService.testConnection(sessionData);

    res.json({
      success: true,
      message: result.message,
      connectionTest: {
        hostname: sessionData.hostname,
        port: sessionData.port,
        username: sessionData.username,
        success: result.success
      }
    });
  } catch (error) {
    console.error('Test connection error:', error.message);
    
    if (error.message === 'Session not found') {
      return res.status(404).json({
        error: 'Session not found.'
      });
    }

    // SSH connection errors
    if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
      return res.status(400).json({
        error: 'Connection failed: Unable to reach the host.',
        details: error.message
      });
    }

    if (error.message.includes('Authentication failed')) {
      return res.status(400).json({
        error: 'Connection failed: Authentication failed.',
        details: error.message
      });
    }

    res.status(500).json({
      error: 'Connection test failed.',
      details: error.message
    });
  }
});

// @route   GET /api/sessions/stats
// @desc    Get connection statistics
// @access  Private
router.get('/stats/connections', async (req, res) => {
  try {
    const stats = sshService.getStats();
    
    // Filter connections to only show user's connections
    const userConnections = stats.connections.filter(conn => {
      // This would need to be enhanced to properly filter by user
      // For now, we'll return basic stats
      return true;
    });

    res.json({
      success: true,
      stats: {
        totalConnections: userConnections.length,
        connections: userConnections
      }
    });
  } catch (error) {
    console.error('Get stats error:', error.message);
    res.status(500).json({
      error: 'Internal server error while fetching statistics.'
    });
  }
});

module.exports = router;
