const sshService = require('../services/sshService');
const sftpService = require('../services/sftpService');
const sessionService = require('../services/sessionService');
const authService = require('../services/authService');

const handleSocketConnection = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    
    // Store user info on socket for authentication
    socket.authenticated = false;
    socket.userId = null;

    // Authentication middleware for socket
    socket.on('authenticate', async (data) => {
      try {
        const { token } = data;
        
        if (!token) {
          socket.emit('auth-error', { message: 'No token provided' });
          return;
        }

        const decoded = authService.verifyToken(token);
        socket.authenticated = true;
        socket.userId = decoded.id;
        socket.username = decoded.username;

        socket.emit('authenticated', { 
          success: true,
          user: { id: decoded.id, username: decoded.username }
        });

        console.log(`Socket ${socket.id} authenticated as user ${decoded.username}`);
      } catch (error) {
        console.error('Socket authentication error:', error.message);
        socket.emit('auth-error', { message: 'Invalid token' });
      }
    });

    // Connect to SSH session
    socket.on('connect-session', async (data) => {
      try {
        if (!socket.authenticated) {
          socket.emit('connection-error', { message: 'Not authenticated' });
          return;
        }

        const { sessionId } = data;
        
        if (!sessionId) {
          socket.emit('connection-error', { message: 'Session ID required' });
          return;
        }

        console.log(`User ${socket.username} connecting to session ${sessionId}`);

        // Get session with credentials
        const sessionData = await sessionService.getSessionWithCredentials(
          parseInt(sessionId), 
          socket.userId
        );

        // Connect to SSH
        const connectionId = await sshService.connect(sessionData, socket);
        
        socket.connectionId = connectionId;
        socket.sessionId = sessionId;

        socket.emit('connection-established', {
          success: true,
          connectionId: connectionId,
          session: {
            id: sessionData.id,
            name: sessionData.name,
            hostname: sessionData.hostname,
            username: sessionData.username
          }
        });

        console.log(`SSH connection established: ${connectionId}`);
      } catch (error) {
        console.error('SSH connection error:', error.message);
        socket.emit('connection-error', { 
          message: error.message || 'Failed to connect to SSH session'
        });
      }
    });

    // Handle terminal input
    socket.on('terminal-input', (data) => {
      if (!socket.authenticated || !socket.connectionId) {
        return;
      }

      // The input handling is managed by the SSH service
      // This event is captured in the sshService.setupStreamHandlers method
    });

    // Handle terminal resize
    socket.on('terminal-resize', (data) => {
      if (!socket.authenticated || !socket.connectionId) {
        return;
      }

      // The resize handling is managed by the SSH service
      // This event is captured in the sshService.setupStreamHandlers method
    });

    // Connect to SFTP
    socket.on('connect-sftp', async (data) => {
      try {
        if (!socket.authenticated) {
          socket.emit('sftp-connection-error', { message: 'Not authenticated' });
          return;
        }

        const { sessionId } = data;
        
        if (!sessionId) {
          socket.emit('sftp-connection-error', { message: 'Session ID required' });
          return;
        }

        console.log(`User ${socket.username} connecting to SFTP session ${sessionId}`);

        // Get session with credentials
        const sessionData = await sessionService.getSessionWithCredentials(
          parseInt(sessionId), 
          socket.userId
        );

        // Connect to SFTP
        const result = await sftpService.connect(sessionData, socket);
        
        socket.sftpConnectionId = result.connectionId;

        socket.emit('sftp-connected', {
          success: true,
          connectionId: result.connectionId,
          session: {
            id: sessionData.id,
            name: sessionData.name,
            hostname: sessionData.hostname,
            username: sessionData.username
          }
        });

        console.log(`SFTP connection established: ${result.connectionId}`);
      } catch (error) {
        console.error('SFTP connection error:', error.message);
        socket.emit('sftp-connection-error', { 
          message: error.message || 'Failed to connect to SFTP session'
        });
      }
    });

    // Handle disconnect SSH session
    socket.on('disconnect-session', (data) => {
      const forceClose = data && data.forceClose;
      
      if (socket.connectionId) {
        console.log(`Disconnecting SSH session: ${socket.connectionId}, force: ${forceClose}`);
        sshService.disconnect(socket.connectionId, forceClose);
        socket.connectionId = null;
        socket.sessionId = null;
      }
      
      // Also disconnect SFTP if connected
      if (socket.sftpConnectionId) {
        console.log(`Disconnecting SFTP session: ${socket.sftpConnectionId}`);
        sftpService.disconnect(socket.sftpConnectionId);
        socket.sftpConnectionId = null;
      }
    });

    // Handle disconnect SFTP session only
    socket.on('disconnect-sftp', () => {
      if (socket.sftpConnectionId) {
        console.log(`Disconnecting SFTP session: ${socket.sftpConnectionId}`);
        sftpService.disconnect(socket.sftpConnectionId);
        socket.sftpConnectionId = null;
      }
    });

    // Handle socket disconnect
    socket.on('disconnect', (reason) => {
      console.log(`Socket ${socket.id} disconnected: ${reason}`);
      
      // Don't immediately disconnect SSH if it's a persistent connection
      // The connection will remain alive for reconnection
      if (socket.connectionId && reason !== 'client namespace disconnect') {
        const connection = sshService.getConnection(socket.connectionId);
        if (connection && connection.persistent) {
          console.log(`Keeping persistent SSH connection alive: ${socket.connectionId}`);
        } else {
          console.log(`Cleaning up SSH connection: ${socket.connectionId}`);
          sshService.disconnect(socket.connectionId);
        }
      }
      
      if (socket.sftpConnectionId) {
        console.log(`Cleaning up SFTP connection: ${socket.sftpConnectionId}`);
        sftpService.disconnect(socket.sftpConnectionId);
      }
    });

    // Handle connection status request
    socket.on('get-connection-status', () => {
      if (!socket.authenticated) {
        socket.emit('connection-status', { connected: false, reason: 'Not authenticated' });
        return;
      }

      const isConnected = socket.connectionId && sshService.getConnection(socket.connectionId);
      
      socket.emit('connection-status', {
        connected: !!isConnected,
        connectionId: socket.connectionId,
        sessionId: socket.sessionId
      });
    });

    // Get all user's persistent connections
    socket.on('get-user-connections', () => {
      if (!socket.authenticated) {
        socket.emit('user-connections', { connections: [] });
        return;
      }

      const connections = sshService.getUserConnections(socket.userId);
      socket.emit('user-connections', { connections });
    });

    // Attach to an existing connection
    socket.on('attach-to-connection', (data) => {
      if (!socket.authenticated) {
        socket.emit('attach-error', { message: 'Not authenticated' });
        return;
      }

      const { connectionId } = data;
      const success = sshService.attachSocketToConnection(connectionId, socket);
      
      if (success) {
        socket.connectionId = connectionId;
        socket.emit('attached-to-connection', { connectionId, success: true });
      } else {
        socket.emit('attach-error', { message: 'Failed to attach to connection' });
      }
    });

    // Handle ping/pong for keepalive
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // Error handling
    socket.on('error', (error) => {
      console.error(`Socket ${socket.id} error:`, error);
    });

    // Initial connection message
    socket.emit('connected', {
      message: 'Connected to IntelliSSH server',
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });
  });

  // Periodic cleanup of stale connections
  setInterval(() => {
    const cleanedUpSSH = sshService.cleanupStaleConnections();
    if (cleanedUpSSH > 0) {
      console.log(`Cleaned up ${cleanedUpSSH} stale SSH connections`);
    }
    
    const cleanedUpSFTP = sftpService.cleanupStaleConnections();
    if (cleanedUpSFTP > 0) {
      console.log(`Cleaned up ${cleanedUpSFTP} stale SFTP connections`);
    }
  }, 5 * 60 * 1000); // Every 5 minutes
};

module.exports = handleSocketConnection;
