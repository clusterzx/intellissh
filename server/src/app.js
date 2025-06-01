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
const authRoutes = require('./api/auth');
const sessionRoutes = require('./api/sessions');
const debugRoutes = require('./api/debug');
const settingsRoutes = require('./api/settings');
const handleSocketConnection = require('./socket/terminal');
const { handleAuthError } = require('./middleware/authMiddleware');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:8080",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Basic security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:8080",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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

app.use(generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} ${req.method} ${req.path} - ${req.ip}`);
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
    const encryptionService = require('./services/encryptionService');
    const llmService = require('./services/llmService');
    const sessionService = require('./services/sessionService');
    
    // Initialize services in parallel
    await Promise.all([
      encryptionService.init(),
      // We initialize LLM service with global settings for startup only
      // User-specific settings will be loaded for each connection
      llmService.init(),
      sessionService.init()
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
