const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const tagService = require('../services/tagService');

const router = express.Router();

// All tag routes require authentication
router.use(authenticateToken);

// @route   GET /api/tags
// @desc    Get all tags for the authenticated user
router.get('/', async (req, res) => {
  try {
    const tags = await tagService.getTagsByUserId(req.user.id);
    res.json({
      success: true,
      tags
    });
  } catch (error) {
    console.error('Get tags error:', error.message);
    res.status(500).json({
      error: 'Internal server error while fetching tags.'
    });
  }
});

// @route   POST /api/tags
// @desc    Create a new tag
router.post('/', async (req, res) => {
  try {
    const tag = await tagService.createTag(req.user.id, { name: req.body.name });
    res.status(201).json({
      success: true,
      tag
    });
  } catch (error) {
    console.error('Create tag error:', error.message);

    if (error.message.includes('required') || error.message.includes('exists')) {
      return res.status(400).json({
        error: error.message
      });
    }

    res.status(500).json({
      error: 'Internal server error while creating tag.'
    });
  }
});

// @route   PUT /api/tags/:id
// @desc    Update an existing tag
router.put('/:id', async (req, res) => {
  try {
    const tagId = parseInt(req.params.id, 10);

    if (Number.isNaN(tagId) || tagId <= 0) {
      return res.status(400).json({
        error: 'Invalid tag ID.'
      });
    }

    const tag = await tagService.updateTag(tagId, req.user.id, { name: req.body.name });

    res.json({
      success: true,
      tag
    });
  } catch (error) {
    console.error('Update tag error:', error.message);

    if (error.message === 'Tag not found') {
      return res.status(404).json({
        error: 'Tag not found.'
      });
    }

    if (error.message.includes('required') || error.message.includes('exists') || error.message.includes('Invalid tag ID')) {
      return res.status(400).json({
        error: error.message
      });
    }

    res.status(500).json({
      error: 'Internal server error while updating tag.'
    });
  }
});

// @route   DELETE /api/tags/:id
// @desc    Delete a tag
router.delete('/:id', async (req, res) => {
  try {
    const tagId = parseInt(req.params.id, 10);

    if (Number.isNaN(tagId) || tagId <= 0) {
      return res.status(400).json({
        error: 'Invalid tag ID.'
      });
    }

    await tagService.deleteTag(tagId, req.user.id);

    res.json({
      success: true,
      message: 'Tag deleted successfully.'
    });
  } catch (error) {
    console.error('Delete tag error:', error.message);

    if (error.message === 'Tag not found') {
      return res.status(404).json({
        error: 'Tag not found.'
      });
    }

    if (error.message.includes('Invalid tag ID')) {
      return res.status(400).json({
        error: error.message
      });
    }

    res.status(500).json({
      error: 'Internal server error while deleting tag.'
    });
  }
});

module.exports = router;
