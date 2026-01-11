require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import services and middleware
const db = require('./db/database');
const { runMigration } = require('./db/migration');

// Load routes
const authRoutes = require('./api/auth');
const sessionRoutes = require('./api/sessions');
const debugRoutes = require('./api/debug');
const settingsRoutes = require('./api/settings');
const filesRoutes = require('./api/files');
const credentialRoutes = require('./api/credentials');
const tagRoutes = require('./api/tags');
const handleSocketConnection = require('./socket/terminal');
const { handleAuthError } = require('./middleware/authMiddleware');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with permissive CORS for LAN compatibility
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false
  },
  transports: ['websocket', 'polling']
});

// HELMET IS COMPLETELY DISABLED - NO SECURITY HEADERS
console.log('Running with NO security headers - Helmet is completely disabled');

// CORS configuration - completely disabled for compatibility
app.use((req, res, next) => {
  // Completely disable CORS restrictions
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  
  // Remove any security headers that might have been added elsewhere
  // Remove CSP headers
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('Content-Security-Policy-Report-Only');
  
  // Remove HTTPS enforcement headers
  res.removeHeader('Strict-Transport-Security');
  
  // Remove cross-origin restriction headers
  res.removeHeader('Cross-Origin-Opener-Policy');
  res.removeHeader('Cross-Origin-Resource-Policy');
  res.removeHeader('Cross-Origin-Embedder-Policy');
  
  // Remove other security headers that might interfere
  res.removeHeader('X-Frame-Options');
  res.removeHeader('X-XSS-Protection');
  res.removeHeader('Origin-Agent-Cluster');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).send();
  } else {
    next();
  }
});

/*
// Rate limiting
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
*/

// app.use(generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} ${req.method} ${req.path} - ${req.ip}`);
  
  // Add response header logging
  const originalSend = res.send;
  res.send = function(...args) {
    // Log the headers being sent
    console.log(`${timestamp} Response headers for ${req.method} ${req.path}:`, JSON.stringify(res.getHeaders()));
    return originalSend.apply(res, args);
  };
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/ssh', debugRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/credentials', credentialRoutes);
app.use('/api/tags', tagRoutes);

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

if (process.env.NODE_ENV === 'production') {
  let clientBuildPath = path.join(__dirname, '../public');
  
  app.use(express.static(clientBuildPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  let clientBuildPath = path.join(__dirname, '../../client/dist');
  
  app.use(express.static(clientBuildPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Auth error handling middleware
app.use(handleAuthError);

// Global error handling middleware
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // Don't expose error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    error: isDevelopment ? error.message : 'Internal server error',
    ...(isDevelopment && { stack: error.stack })
  });
});

// Socket.IO connection handling
handleSocketConnection(io);

// Initialize database and start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Connect to database
    await db.connect();
    console.log('Database connected successfully');
    
    // Run database migrations
    await runMigration();
    
    // Initialize services that need database settings
    console.log('Attempting to require encryptionService...');
    const encryptionService = require('./services/encryptionService');
    console.log('Attempting to require llmService...');
    const llmService = require('./services/llmService');
    console.log('Attempting to require sessionService...');
    const sessionService = require('./services/sessionService');

    console.log('Initializing services in parallel...');
    await Promise.all([
      (async () => {
        try {
          await encryptionService.init();
          console.log('Encryption service initialized.');
        } catch (e) {
          console.error('Error initializing encryption service:', e);
          throw e;
        }
      })(),
      (async () => {
        try {
          await llmService.init();
          console.log('LLM service initialized.');
        } catch (e) {
          console.error('Error initializing LLM service:', e);
          throw e;
        }
      })(),
      (async () => {
        try {
          await sessionService.init();
          console.log('Session service initialized.');
        } catch (e) {
          console.error('Error initializing session service:', e);
          throw e;
        }
      })()
    ]);

    console.log('Services initialized with database settings');
    console.log('NOTE: LLM service is initialized with global settings at startup.');
    console.log('      User-specific settings will be loaded for each connection.');
    
    // Start server
    server.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════╗
║         IntelliSSH Server            ║
║                                          ║
║  🚀 Server running on port ${PORT}          ║
║  📡 Environment: ${process.env.NODE_ENV || 'development'}           ║
║  🔗 WebSocket: Enabled                   ║
║  🛡️  Security: Enabled                   ║
║                                          ║
║  API Endpoints:                          ║
║  • /api/auth    - Authentication         ║
║  • /api/sessions - Session Management    ║
║  • /api/ssh     - SSH Debug Tools        ║
║  • /api/files   - File Management        ║
║  • /health      - Health Check           ║
║                                          ║
╚══════════════════════════════════════════╝
      `);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close server
    server.close(() => {
      console.log('HTTP server closed');
    });
    
    // Close database connection
    await db.close();
    console.log('Database connection closed');
    
    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the server
startServer();

module.exports = { app, server, io };
