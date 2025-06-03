const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const sftpService = require('../services/sftpService');
const { authenticateToken } = require('../middleware/authMiddleware');

// Set up temp directory for file uploads/downloads
const tempDir = path.join(__dirname, '../../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Set up multer for handling file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Create a user-specific directory
    const userDir = path.join(tempDir, req.userId.toString());
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: function(req, file, cb) {
    // Use a UUID to prevent filename collisions, but keep the original extension
    const extension = path.extname(file.originalname);
    const uniqueFilename = `${uuidv4()}${extension}`;
    cb(null, uniqueFilename);
  }
});

const upload = multer({ storage: storage });

// Clean up temp files older than 1 hour
const cleanupTempFiles = () => {
  try {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // Read all user directories
    if (fs.existsSync(tempDir)) {
      const userDirs = fs.readdirSync(tempDir);
      userDirs.forEach(userId => {
        const userDir = path.join(tempDir, userId);
        
        // Skip if not a directory
        if (!fs.existsSync(userDir) || !fs.statSync(userDir).isDirectory()) return;
        
        const files = fs.readdirSync(userDir);
        files.forEach(file => {
          const filePath = path.join(userDir, file);
          const stats = fs.statSync(filePath);
          
          // Delete files older than one hour
          if (now - stats.mtime.getTime() > oneHour) {
            fs.unlinkSync(filePath);
            console.log(`Deleted old temp file: ${filePath}`);
          }
        });
        
        // Remove directory if empty
        if (fs.readdirSync(userDir).length === 0) {
          fs.rmdirSync(userDir);
          console.log(`Removed empty user directory: ${userDir}`);
        }
      });
    }
  } catch (error) {
    console.error('Error during temp file cleanup:', error);
  }
};

// Run cleanup every hour
setInterval(cleanupTempFiles, 60 * 60 * 1000);

// Initialize directories
try {
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log('Created temp directory at:', tempDir);
  }
} catch (error) {
  console.error('Failed to create temp directory:', error);
}

// File upload handler
const handleFileUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Return the local server path and file info
    res.json({
      success: true,
      localPath: req.file.path,
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: error.message });
  }
};

// SFTP upload handler
const handleSftpUpload = async (req, res) => {
  try {
    const { localPath, remotePath, connectionId } = req.body;
    
    if (!localPath || !remotePath || !connectionId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Verify file exists
    if (!fs.existsSync(localPath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    // Upload to SFTP
    const result = await sftpService.uploadFile(connectionId, localPath, remotePath);
    
    // Return success
    res.json(result);
    
    // Schedule the temp file for deletion after a delay
    setTimeout(() => {
      try {
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
          console.log(`Deleted temp file after upload: ${localPath}`);
        }
      } catch (error) {
        console.error(`Failed to delete temp file: ${localPath}`, error);
      }
    }, 5 * 60 * 1000); // Delete after 5 minutes

  } catch (error) {
    console.error('SFTP upload error:', error);
    res.status(500).json({ error: error.message });
  }
};

// SFTP download handler
const handleSftpDownload = async (req, res) => {
  try {
    const { remotePath, connectionId } = req.body;
    
    if (!remotePath || !connectionId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Create a unique filename in the user's temp directory
    const userDir = path.join(tempDir, req.userId.toString());
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    const filename = path.basename(remotePath);
    const extension = path.extname(filename);
    const uniqueFilename = `${uuidv4()}${extension}`;
    const localPath = path.join(userDir, uniqueFilename);

    // Download from SFTP
    const result = await sftpService.downloadFile(connectionId, remotePath, localPath);
    
    // Return success with the local path for browser download
    res.json({
      ...result,
      downloadUrl: `/api/files/download/${req.userId}/${uniqueFilename}`,
      originalFilename: filename
    });

  } catch (error) {
    console.error('SFTP download error:', error);
    res.status(500).json({ error: error.message });
  }
};

// File download handler
const handleFileDownload = async (req, res) => {
  try {
    const { userId, filename } = req.params;
    
    const filePath = path.join(tempDir, userId, filename);
    
    // Verify file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }

    // Get original filename from query or use the current filename
    const originalFilename = req.query.name || filename;
    
    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${originalFilename}"`);
    
    // Send the file
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
      } else {
        // Schedule the file for deletion after a delay
        setTimeout(() => {
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`Deleted temp file after download: ${filePath}`);
            }
          } catch (error) {
            console.error(`Failed to delete temp file: ${filePath}`, error);
          }
        }, 5 * 60 * 1000); // Delete after 5 minutes
      }
    });

  } catch (error) {
    console.error('File download error:', error);
    res.status(500).send('Server error');
  }
};

// Register routes
router.post('/upload', authenticateToken, upload.single('file'), handleFileUpload);
router.post('/sftp-upload', authenticateToken, handleSftpUpload);
router.post('/sftp-download', authenticateToken, handleSftpDownload);
router.get('/download/:userId/:filename', handleFileDownload);

module.exports = router;
