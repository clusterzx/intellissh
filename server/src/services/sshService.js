const { Client } = require('ssh2');
const pty = require('node-pty');
const { EventEmitter } = require('events');
const llmService = require('./llmService');

class SSHService extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map();
    this.shells = new Map();
  }

  async connect(sessionData, socket) {
    const { id, hostname, port, username, password, privateKey } = sessionData;
    const connectionId = `${socket.id}_${id}`;

    try {
      console.log(`Attempting SSH connection to ${username}@${hostname}:${port}`);

      const conn = new Client();
      
      return new Promise((resolve, reject) => {
        let connectionTimeout = setTimeout(() => {
          conn.end();
          reject(new Error('Connection timeout'));
        }, 30000); // 30 second timeout

        conn.on('ready', () => {
          clearTimeout(connectionTimeout);
          console.log(`SSH connection established: ${connectionId}`);
          
          // Request a shell
          conn.shell({
            rows: 24,
            cols: 80,
            term: 'xterm-256color'
          }, (err, stream) => {
            if (err) {
              conn.end();
              reject(err);
              return;
            }

            // Store connection and stream
            this.connections.set(connectionId, {
              client: conn,
              stream: stream,
              socket: socket,
              sessionData: sessionData,
              connected: true,
              lastActivity: Date.now()
            });

            // Set up stream event handlers
            this.setupStreamHandlers(connectionId, stream, socket);
            
            resolve(connectionId);
          });
        });

        conn.on('error', (err) => {
          clearTimeout(connectionTimeout);
          console.error(`SSH connection error for ${connectionId}:`, err.message);
          this.cleanup(connectionId);
          reject(err);
        });

        conn.on('end', () => {
          console.log(`SSH connection ended: ${connectionId}`);
          this.cleanup(connectionId);
        });

        conn.on('close', () => {
          console.log(`SSH connection closed: ${connectionId}`);
          this.cleanup(connectionId);
        });

        // Prepare connection options
        const connectOptions = {
          host: hostname,
          port: port || 22,
          username: username,
          readyTimeout: 20000,
          keepaliveInterval: 60000
        };

        // Add authentication method
        if (privateKey) {
          connectOptions.privateKey = privateKey;
          
          // Add passphrase if provided
          if (sessionData.keyPassphrase) {
            connectOptions.passphrase = sessionData.keyPassphrase;
          }
        } else if (password) {
          connectOptions.password = password;
        } else {
          // Try agent-based authentication
          connectOptions.agent = process.env.SSH_AUTH_SOCK;
        }

        // Connect
        conn.connect(connectOptions);
      });
    } catch (error) {
      console.error(`SSH service error for ${connectionId}:`, error.message);
      this.cleanup(connectionId);
      throw error;
    }
  }

  setupStreamHandlers(connectionId, stream, socket) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Initialize LLM helper properties
    connection.llmHelperEnabled = false;
    connection.lastCommands = [];
    connection.terminalBuffer = '';
    connection.outputBuffer = '';
    connection.isProcessing = false;
    connection.promptPattern = /^(.+@.+:.+[#$])\s*$/m; // Matches shell prompts like "root@cloudpanel:~#"
    connection.commandRunning = false;
    connection.currentPrompt = null;
    connection.commandCompletionTimer = null;

    // Handle data from SSH stream to browser
    stream.on('data', async (data) => {
      try {
        const output = data.toString();
        socket.emit('terminal-output', output);
        connection.lastActivity = Date.now();
        
        // Store some terminal output for context
        connection.terminalBuffer += output;
        if (connection.terminalBuffer.length > 10000) {
          // Keep only the last 10KB of output to avoid memory issues
          connection.terminalBuffer = connection.terminalBuffer.substring(
            connection.terminalBuffer.length - 10000
          );
        }
        
        // Process output with LLM if enabled for this connection
        if (connection.llmHelperEnabled) {
          // Add to output buffer
          connection.outputBuffer += output;
          
          // Check if the entire buffer ends with a shell prompt
          // This is more reliable than checking just the current output chunk
          const fullBuffer = connection.outputBuffer;
          const promptMatch = fullBuffer.match(connection.promptPattern);
          
          if (promptMatch && fullBuffer.trim().endsWith(promptMatch[0])) {
            // If we detect a prompt at the end of the buffer, it means a command has completed
            if (connection.commandRunning) {
              // A command was running and has now completed
              connection.commandRunning = false;
              
              // Add a small delay to ensure we've received all output
              clearTimeout(connection.commandCompletionTimer);
              connection.commandCompletionTimer = setTimeout(async () => {
                // If we're processing, wait
                if (connection.isProcessing) {
                  return;
                }
                
                // Get buffer content before the prompt
                const promptIndex = fullBuffer.lastIndexOf(promptMatch[0]);
                const outputContent = fullBuffer.substring(0, promptIndex).trim();
                
                // Skip processing if output is too small
                if (!outputContent || outputContent.length < 5) {
                  return;
                }
                
                try {
                  // Set processing flag to prevent multiple concurrent processes
                  connection.isProcessing = true;
                  
                  // Notify client that LLM processing is starting
                  socket.emit('llm-processing-start');
                  
                  const bufferToProcess = connection.outputBuffer;
                  connection.outputBuffer = ''; // Clear buffer after taking its content
                  
                  // Initialize LLM with user settings before processing
                  await llmService.init(socket.userId);
                  
                  const llmResponse = await llmService.processTerminalOutput(
                    connectionId, 
                    bufferToProcess,
                    {
                      sessionData: connection.sessionData,
                      lastCommands: connection.lastCommands || [],
                      userId: socket.userId
                    }
                  );
                  
                  // Notify client that LLM processing is complete
                  socket.emit('llm-processing-end');
                  
                  // Send the response to the client
                  socket.emit('llm-response', llmResponse);
                  
                  // If a command is suggested that requires approval
                  if (llmResponse && llmResponse.requiresApproval) {
                    // Notify the client about the suggested command
                    socket.emit('llm-command-suggestion', {
                      command: llmResponse.command,
                      reasoning: llmResponse.reasoning,
                      requiresApproval: true
                    });
                  }
                  
                  // Reset processing flag
                  connection.isProcessing = false;
                } catch (llmError) {
                  console.error(`LLM processing error for ${connectionId}:`, llmError);
                  socket.emit('llm-error', { message: llmError.message });
                  connection.isProcessing = false;
                }
              }, 1000); // Wait 1 second before processing terminal output to ensure it's complete
            } else {
              // We found a prompt but no command was running, so just store the current prompt
              // and reset the buffer
              connection.currentPrompt = promptMatch[1];
              connection.outputBuffer = '';
            }
          } else if (output.trim() && !connection.commandRunning && output.includes('\n')) {
            // If we get non-prompt output and a command wasn't already marked as running,
            // this likely means a command has just started
            connection.commandRunning = true;
          }
        }
      } catch (error) {
        console.error(`Error sending data to socket ${connectionId}:`, error.message);
      }
    });

    // Handle stream close
    stream.on('close', (code, signal) => {
      console.log(`SSH stream closed for ${connectionId}, code: ${code}, signal: ${signal}`);
      socket.emit('terminal-disconnected', { code, signal });
      
      // Clean up LLM resources
      if (connection.llmHelperEnabled) {
        llmService.clearConversationHistory(connectionId);
      }
      
      this.cleanup(connectionId);
    });

    // Handle stream errors
    stream.on('error', (err) => {
      console.error(`SSH stream error for ${connectionId}:`, err.message);
      socket.emit('terminal-error', { message: err.message });
      this.cleanup(connectionId);
    });

    // Handle input from browser to SSH stream
    socket.on('terminal-input', (data) => {
      try {
        if (connection.connected && stream.writable) {
          stream.write(data);
          connection.lastActivity = Date.now();
          
          // If this appears to be a full command (ends with newline),
          // store it for LLM context and mark a command as running
          if (data.endsWith('\n') || data.endsWith('\r')) {
            const commandText = data.trim();
            if (commandText && commandText.length > 0) {
              if (!connection.lastCommands) connection.lastCommands = [];
              connection.lastCommands.push(commandText);
              if (connection.lastCommands.length > 10) connection.lastCommands.shift();
              
              // Mark that a command is now running
              connection.commandRunning = true;
              connection.outputBuffer = ''; // Reset buffer to capture just the output of this command
            }
          }
        }
      } catch (error) {
        console.error(`Error writing to SSH stream ${connectionId}:`, error.message);
      }
    });

    // Handle terminal resize
    socket.on('terminal-resize', (size) => {
      try {
        if (connection.connected && stream.setWindow) {
          stream.setWindow(size.rows, size.cols);
        }
      } catch (error) {
        console.error(`Error resizing terminal ${connectionId}:`, error.message);
      }
    });

    // Add event handlers for LLM helper
    socket.on('toggle-llm-helper', (data) => {
      try {
        const { enabled } = data;
        if (connection) {
          connection.llmHelperEnabled = !!enabled;
          socket.emit('llm-helper-status', { enabled: connection.llmHelperEnabled });
          
          if (!enabled) {
            // Clear conversation history when disabled
            llmService.clearConversationHistory(connectionId);
          }
        }
      } catch (error) {
        console.error(`Error toggling LLM helper for ${connectionId}:`, error.message);
      }
    });
    
    socket.on('llm-manual-prompt', async (data) => {
      try {
        const { prompt } = data;
        if (connection && connection.llmHelperEnabled) {
          // Notify client that LLM processing is starting
          socket.emit('llm-processing-start');
          
          // Initialize LLM with user settings before processing
          await llmService.init(socket.userId);
          
          const llmResponse = await llmService.processTerminalOutput(
            connectionId,
            '',
            {
              sessionData: connection.sessionData,
              lastCommands: connection.lastCommands || [],
              isDirectPrompt: true,
              prompt: prompt,
              userId: socket.userId
            }
          );
          
          // Notify client that LLM processing is complete
          socket.emit('llm-processing-end');
          
          socket.emit('llm-response', llmResponse);
          
          // If a command is suggested that requires approval (for manual prompts)
          if (llmResponse && llmResponse.requiresApproval) {
            // Notify the client about the suggested command
            socket.emit('llm-command-suggestion', {
              command: llmResponse.command,
              reasoning: llmResponse.reasoning,
              requiresApproval: true
            });
          }
          // If the command should be executed automatically (legacy behavior)
          else if (llmResponse && llmResponse.shouldExecuteCommand) {
            // Store command for context
            if (!connection.lastCommands) connection.lastCommands = [];
            connection.lastCommands.push(llmResponse.command);
            if (connection.lastCommands.length > 10) connection.lastCommands.shift();
            
            // Send the command to terminal
            stream.write(llmResponse.command + '\n');
          }
        } else {
          socket.emit('llm-error', { message: 'LLM Helper is not enabled' });
        }
      } catch (error) {
        console.error(`Error processing manual prompt for ${connectionId}:`, error.message);
        socket.emit('llm-error', { message: error.message });
      }
    });
    
    socket.on('get-llm-settings', async () => {
      try {
        // Ensure LLM service is initialized with the latest settings from the database
        // Pass user ID to get user-specific settings
        await llmService.init(socket.userId);
        socket.emit('llm-settings', llmService.getSettings());
      } catch (error) {
        console.error(`Error getting LLM settings for ${connectionId}:`, error.message);
        socket.emit('llm-error', { message: error.message });
      }
    });
    
    // Handle manual request to analyze terminal output
    socket.on('llm-analyze-terminal', async () => {
      try {
        if (!connection || !connection.llmHelperEnabled) {
          socket.emit('llm-error', { message: 'LLM Helper is not enabled' });
          return;
        }
        
        // Notify client that LLM processing is starting
        socket.emit('llm-processing-start');
        
        // Process the current terminal buffer with the LLM
        // Initialize LLM with user settings before processing
        await llmService.init(socket.userId);
        
        const llmResponse = await llmService.processTerminalOutput(
          connectionId,
          connection.terminalBuffer, // Use the entire terminal buffer
          {
            sessionData: connection.sessionData,
            lastCommands: connection.lastCommands || [],
            userId: socket.userId
          }
        );
        
        // Notify client that LLM processing is complete
        socket.emit('llm-processing-end');
        
        // Send the response to the client
        socket.emit('llm-response', llmResponse);
        
        // If a command is suggested that requires approval
        if (llmResponse && llmResponse.requiresApproval) {
          // Notify the client about the suggested command
          socket.emit('llm-command-suggestion', {
            command: llmResponse.command,
            reasoning: llmResponse.reasoning,
            requiresApproval: true
          });
        }
      } catch (error) {
        console.error(`Error analyzing terminal output for ${connectionId}:`, error.message);
        socket.emit('llm-error', { message: error.message });
      }
    });

    // Handle command execution approval
    socket.on('execute-approved-command', (data) => {
      try {
        const { command } = data;
        if (!connection.connected || !stream.writable) {
          socket.emit('llm-error', { message: 'Terminal connection not available' });
          return;
        }

        console.log(`Executing approved command for ${connectionId}: ${command}`);
        
        // Store command for context
        if (!connection.lastCommands) connection.lastCommands = [];
        connection.lastCommands.push(command);
        if (connection.lastCommands.length > 10) connection.lastCommands.shift();
        
        // Mark that a command is now running
        connection.commandRunning = true;
        connection.outputBuffer = ''; // Reset buffer to capture just the output of this command
        
        // Send the command to terminal
        stream.write(command + '\n');
        
        // Notify the client that the command was executed
        socket.emit('llm-command-executed', { command });
      } catch (error) {
        console.error(`Error executing approved command for ${connectionId}:`, error.message);
        socket.emit('llm-error', { message: error.message });
      }
    });

    // Handle socket disconnect
    socket.on('disconnect', () => {
      console.log(`Socket disconnected for ${connectionId}`);
      this.disconnect(connectionId);
    });
  }

  disconnect(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    try {
      console.log(`Disconnecting SSH connection: ${connectionId}`);
      
      if (connection.stream) {
        connection.stream.end();
      }
      
      if (connection.client) {
        connection.client.end();
      }
      
      this.cleanup(connectionId);
      return true;
    } catch (error) {
      console.error(`Error disconnecting ${connectionId}:`, error.message);
      this.cleanup(connectionId);
      return false;
    }
  }

  cleanup(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.connected = false;
      
      try {
        if (connection.socket) {
          connection.socket.emit('terminal-disconnected');
        }
      } catch (error) {
        // Socket might already be disconnected
      }
      
      this.connections.delete(connectionId);
      console.log(`Cleaned up connection: ${connectionId}`);
    }
  }

  getConnection(connectionId) {
    return this.connections.get(connectionId);
  }

  getAllConnections() {
    const connections = [];
    for (const [id, conn] of this.connections) {
      connections.push({
        id,
        sessionId: conn.sessionData.id,
        hostname: conn.sessionData.hostname,
        username: conn.sessionData.username,
        connected: conn.connected,
        lastActivity: conn.lastActivity
      });
    }
    return connections;
  }

  // Clean up stale connections
  cleanupStaleConnections(maxIdleTime = 3600000) { // 1 hour default
    const now = Date.now();
    const staleConnections = [];

    for (const [connectionId, connection] of this.connections) {
      if (now - connection.lastActivity > maxIdleTime) {
        staleConnections.push(connectionId);
      }
    }

    staleConnections.forEach(connectionId => {
      console.log(`Cleaning up stale connection: ${connectionId}`);
      this.disconnect(connectionId);
    });

    return staleConnections.length;
  }

  // Test SSH connection without establishing a persistent connection
  async testConnection(sessionData) {
    const { hostname, port, username, password, privateKey } = sessionData;

    return new Promise((resolve, reject) => {
      const conn = new Client();
      let connectionTimeout = setTimeout(() => {
        conn.end();
        reject(new Error('Connection timeout'));
      }, 15000); // 15 second timeout for test

      conn.on('ready', () => {
        clearTimeout(connectionTimeout);
        conn.end();
        resolve({ success: true, message: 'Connection successful' });
      });

      conn.on('error', (err) => {
        clearTimeout(connectionTimeout);
        reject(err);
      });

      // Prepare connection options
      const connectOptions = {
        host: hostname,
        port: port || 22,
        username: username,
        readyTimeout: 10000
      };

      // Add authentication method
      if (privateKey) {
        connectOptions.privateKey = privateKey;
        
        // Add passphrase if provided
        if (sessionData.keyPassphrase) {
          connectOptions.passphrase = sessionData.keyPassphrase;
        }
      } else if (password) {
        connectOptions.password = password;
      } else {
        // Try agent-based authentication
        connectOptions.agent = process.env.SSH_AUTH_SOCK;
      }

      conn.connect(connectOptions);
    });
  }

  // Get connection statistics
  getStats() {
    return {
      totalConnections: this.connections.size,
      connections: this.getAllConnections()
    };
  }
}

module.exports = new SSHService();
