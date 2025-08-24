import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { io } from 'socket.io-client'
import { useAuthStore } from './authStore'

export const useTerminalStore = defineStore('terminal', () => {
  // State
  const socket = ref(null)
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const connectionError = ref(null)
  const activeSession = ref(null)
  const terminalOutput = ref('')
  const connectionId = ref(null)
  
  // SFTP state
  const sftpConnected = ref(false)
  const sftpConnecting = ref(false)
  const sftpConnectionError = ref(null)
  const sftpConnectionId = ref(null)
  const sftpCurrentPath = ref('.')
  const sftpDirectoryContents = ref([])
  const sftpTransfers = ref([])

  // Getters
  const socketConnected = computed(() => isConnected.value)
  const connecting = computed(() => isConnecting.value)
  const hasActiveSession = computed(() => !!activeSession.value)
  const error = computed(() => connectionError.value)
  
  // SFTP getters
  const hasSftpConnection = computed(() => sftpConnected.value)
  const sftpConnectingStatus = computed(() => sftpConnecting.value)
  const sftpError = computed(() => sftpConnectionError.value)
  const currentDirectory = computed(() => sftpCurrentPath.value)
  const directoryContents = computed(() => sftpDirectoryContents.value)
  const activeTransfers = computed(() => sftpTransfers.value)

  // Actions
  const connectSocket = () => {
    if (socket.value?.connected) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      socket.value = io('/', {
        transports: ['websocket', 'polling'],
        timeout: 10000
      })

      socket.value.on('connect', () => {
        console.log('Socket connected:', socket.value.id)
        isConnected.value = true
        connectionError.value = null
        resolve()
      })

      socket.value.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason)
        isConnected.value = false
        activeSession.value = null
        connectionId.value = null
      })

      socket.value.on('connect_error', (error) => {
        console.error('Socket connection error:', error)
        connectionError.value = error.message
        isConnected.value = false
        reject(error)
      })

      socket.value.on('error', (error) => {
        console.error('Socket error:', error)
        connectionError.value = error.message
      })
    })
  }

  const authenticateSocket = async () => {
    const authStore = useAuthStore()
    
    if (!socket.value || !authStore.token) {
      throw new Error('Socket not connected or no auth token')
    }

    return new Promise((resolve, reject) => {
      socket.value.emit('authenticate', { token: authStore.token })

      socket.value.on('authenticated', (data) => {
        console.log('Socket authenticated:', data)
        resolve(data)
      })

      socket.value.on('auth-error', (error) => {
        console.error('Socket authentication error:', error)
        connectionError.value = error.message
        reject(new Error(error.message))
      })
    })
  }

  const connectToSession = async (sessionId, reuseExisting = true) => {
    if (!socket.value?.connected) {
      throw new Error('Socket not connected')
    }

    isConnecting.value = true
    connectionError.value = null

    return new Promise((resolve, reject) => {
      socket.value.emit('connect-session', { sessionId, reuseExisting })

      const handleConnectionEstablished = (data) => {
        console.log('SSH connection established:', data)
        activeSession.value = data.session
        connectionId.value = data.connectionId
        isConnecting.value = false
        
        // Clean up event listeners
        socket.value.off('connection-established', handleConnectionEstablished)
        socket.value.off('connection-error', handleConnectionError)
        
        resolve(data)
      }

      const handleConnectionError = (error) => {
        console.error('SSH connection error:', error)
        connectionError.value = error.message
        isConnecting.value = false
        
        // Clean up event listeners
        socket.value.off('connection-established', handleConnectionEstablished)
        socket.value.off('connection-error', handleConnectionError)
        
        reject(new Error(error.message))
      }

      socket.value.on('connection-established', handleConnectionEstablished)
      socket.value.on('connection-error', handleConnectionError)

      // Timeout after 30 seconds
      setTimeout(() => {
        if (isConnecting.value) {
          isConnecting.value = false
          socket.value.off('connection-established', handleConnectionEstablished)
          socket.value.off('connection-error', handleConnectionError)
          reject(new Error('Connection timeout'))
        }
      }, 30000)
    })
  }

  const disconnectSession = (forceClose = false) => {
    if (!socket.value) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      socket.value.emit('disconnect-session', { forceClose });
      
      if (forceClose) {
        activeSession.value = null;
        connectionId.value = null;
      }
      
      resolve();
    });
  }

  const sendInput = (data) => {
    if (socket.value?.connected && activeSession.value) {
      socket.value.emit('terminal-input', data)
    }
  }

  const resizeTerminal = (size) => {
    if (socket.value?.connected && activeSession.value) {
      socket.value.emit('terminal-resize', size)
    }
  }

  const setupTerminalListeners = (terminal) => {
    if (!socket.value) return

    // Handle terminal output from server
    socket.value.on('terminal-output', (data) => {
      if (terminal && typeof terminal.write === 'function') {
        terminal.write(data)
      }
      terminalOutput.value += data
    })

    // Handle terminal disconnection
    socket.value.on('terminal-disconnected', (data) => {
      console.log('Terminal disconnected:', data)
      
      if (terminal && typeof terminal.write === 'function') {
        terminal.write('\r\n\x1b[31mConnection closed.\x1b[0m\r\n')
      }
      resetTerminalState() // Call the new reset function
    })

    // Handle terminal errors
    socket.value.on('terminal-error', (error) => {
      console.error('Terminal error:', error)
      connectionError.value = error.message
      
      if (terminal && typeof terminal.write === 'function') {
        terminal.write(`\r\n\x1b[31mError: ${error.message}\x1b[0m\r\n`)
      }
    })
  }

  const getConnectionStatus = () => {
    if (socket.value?.connected) {
      socket.value.emit('get-connection-status')
    }
  }

  const clearError = () => {
    connectionError.value = null
  }

  const resetTerminalState = () => {
    isConnecting.value = false
    activeSession.value = null
    connectionId.value = null
    connectionError.value = null
    terminalOutput.value = ''
  }

  const ping = () => {
    if (socket.value?.connected) {
      socket.value.emit('ping')
    }
  }

  const getUserConnections = async () => {
    if (!socket.value?.connected) {
      return [];
    }
    
    return new Promise((resolve) => {
      socket.value.emit('get-user-connections');
      
      const handleConnections = (data) => {
        socket.value.off('user-connections', handleConnections);
        resolve(data.connections || []);
      };
      
      socket.value.on('user-connections', handleConnections);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        socket.value.off('user-connections', handleConnections);
        resolve([]);
      }, 5000);
    });
  };

  const attachToConnection = async (connectionId) => {
    if (!socket.value?.connected) {
      throw new Error('Socket not connected');
    }
    
    return new Promise((resolve, reject) => {
      socket.value.emit('attach-to-connection', { connectionId });
      
      const handleAttached = (data) => {
        socket.value.off('attached-to-connection', handleAttached);
        socket.value.off('attach-error', handleError);
        resolve(data);
      };
      
      const handleError = (error) => {
        socket.value.off('attached-to-connection', handleAttached);
        socket.value.off('attach-error', handleError);
        reject(new Error(error.message));
      };
      
      socket.value.on('attached-to-connection', handleAttached);
      socket.value.on('attach-error', handleError);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        socket.value.off('attached-to-connection', handleAttached);
        socket.value.off('attach-error', handleError);
        reject(new Error('Attachment timeout'));
      }, 10000);
    });
  };

  // SFTP actions
  const connectToSftp = async (sessionId) => {
    if (!socket.value?.connected) {
      throw new Error('SFTP not connected')
    }

    sftpConnecting.value = true
    sftpConnectionError.value = null

    return new Promise((resolve, reject) => {
      socket.value.emit('connect-sftp', { sessionId })

      const handleConnectionEstablished = (data) => {
        console.log('SFTP connection established:', data)
        sftpConnectionId.value = data.connectionId
        sftpConnected.value = true
        sftpConnecting.value = false
        
        // Clean up event listeners
        socket.value.off('sftp-connected', handleConnectionEstablished)
        socket.value.off('sftp-connection-error', handleConnectionError)
        
        resolve(data)
      }

      const handleConnectionError = (error) => {
        console.error('SFTP connection error:', error)
        sftpConnectionError.value = error.message
        sftpConnecting.value = false
        
        // Clean up event listeners
        socket.value.off('sftp-connected', handleConnectionEstablished)
        socket.value.off('sftp-connection-error', handleConnectionError)
        
        reject(new Error(error.message))
      }

      socket.value.on('sftp-connected', handleConnectionEstablished)
      socket.value.on('sftp-connection-error', handleConnectionError)

      // Timeout after 30 seconds
      setTimeout(() => {
        if (sftpConnecting.value) {
          sftpConnecting.value = false
          socket.value.off('sftp-connected', handleConnectionEstablished)
          socket.value.off('sftp-connection-error', handleConnectionError)
          reject(new Error('SFTP connection timeout'))
        }
      }, 30000)
    })
  }

  const disconnectSftp = () => {
    if (socket.value && sftpConnected.value) {
      socket.value.emit('disconnect-sftp')
      sftpConnected.value = false
      sftpConnectionId.value = null
      sftpCurrentPath.value = '.'
      sftpDirectoryContents.value = []
    }
  }

  const listDirectory = (path = '.') => {
    if (!socket.value?.connected || !sftpConnected.value) {
      return Promise.reject(new Error('SFTP not connected'))
    }

    return new Promise((resolve, reject) => {
      socket.value.emit('sftp-list-directory', { path })

      const handleDirectoryListed = (result) => {
        console.log('Directory listed:', result)
        sftpCurrentPath.value = result.path
        sftpDirectoryContents.value = result.files
        
        // Clean up event listeners
        socket.value.off('sftp-directory-listed', handleDirectoryListed)
        socket.value.off('sftp-error', handleError)
        
        resolve(result)
      }

      const handleError = (error) => {
        console.error('SFTP error:', error)
        sftpConnectionError.value = error.message
        
        // Clean up event listeners
        socket.value.off('sftp-directory-listed', handleDirectoryListed)
        socket.value.off('sftp-error', handleError)
        
        reject(new Error(error.message))
      }

      socket.value.on('sftp-directory-listed', handleDirectoryListed)
      socket.value.on('sftp-error', handleError)

      // Timeout after 30 seconds
      setTimeout(() => {
        socket.value.off('sftp-directory-listed', handleDirectoryListed)
        socket.value.off('sftp-error', handleError)
        reject(new Error('Listing directory timeout'))
      }, 30000)
    })
  }

  const downloadFile = (remotePath, localPath) => {
    if (!socket.value?.connected || !sftpConnected.value) {
      return Promise.reject(new Error('SFTP not connected'))
    }

    return new Promise((resolve, reject) => {
      // Create a transfer object to track progress
      const transferId = `download_${Date.now()}_${remotePath.split('/').pop()}`
      const transfer = {
        id: transferId,
        type: 'download',
        remotePath,
        localPath,
        progress: 0,
        status: 'starting',
        error: null
      }
      
      // Add to transfers list
      sftpTransfers.value.push(transfer)
      
      socket.value.emit('sftp-download-file', { remotePath, localPath })

      // Handle progress updates
      socket.value.on('sftp-download-progress', (progress) => {
        if (progress.transferId !== transferId) return
        
        const index = sftpTransfers.value.findIndex(t => t.id === transferId)
        if (index !== -1) {
          sftpTransfers.value[index].progress = progress.percentage
          sftpTransfers.value[index].status = 'downloading'
        }
      })

      const handleComplete = (result) => {
        console.log('Download complete:', result)
        
        const index = sftpTransfers.value.findIndex(t => t.id === transferId)
        if (index !== -1) {
          sftpTransfers.value[index].progress = 100
          sftpTransfers.value[index].status = 'complete'
        }
        
        // Clean up event listeners
        socket.value.off('sftp-download-complete', handleComplete)
        socket.value.off('sftp-download-error', handleError)
        socket.value.off('sftp-error', handleError)
        
        resolve(result)
      }

      const handleError = (error) => {
        console.error('Download error:', error)
        
        const index = sftpTransfers.value.findIndex(t => t.id === transferId)
        if (index !== -1) {
          sftpTransfers.value[index].status = 'error'
          sftpTransfers.value[index].error = error.message
        }
        
        // Clean up event listeners
        socket.value.off('sftp-download-complete', handleComplete)
        socket.value.off('sftp-download-error', handleError)
        socket.value.off('sftp-error', handleError)
        
        reject(new Error(error.message))
      }

      socket.value.on('sftp-download-complete', handleComplete)
      socket.value.on('sftp-download-error', handleError)
      socket.value.on('sftp-error', handleError)
    })
  }

  const uploadFile = (localPath, remotePath) => {
    if (!socket.value?.connected || !sftpConnected.value) {
      return Promise.reject(new Error('SFTP not connected'))
    }

    return new Promise((resolve, reject) => {
      // Create a transfer object to track progress
      const transferId = `upload_${Date.now()}_${localPath.split('/').pop()}`
      const transfer = {
        id: transferId,
        type: 'upload',
        remotePath,
        localPath,
        progress: 0,
        status: 'starting',
        error: null
      }
      
      // Add to transfers list
      sftpTransfers.value.push(transfer)
      
      socket.value.emit('sftp-upload-file', { localPath, remotePath })

      // Handle progress updates
      socket.value.on('sftp-upload-progress', (progress) => {
        if (progress.transferId !== transferId) return
        
        const index = sftpTransfers.value.findIndex(t => t.id === transferId)
        if (index !== -1) {
          sftpTransfers.value[index].progress = progress.percentage
          sftpTransfers.value[index].status = 'uploading'
        }
      })

      const handleComplete = (result) => {
        console.log('Upload complete:', result)
        
        const index = sftpTransfers.value.findIndex(t => t.id === transferId)
        if (index !== -1) {
          sftpTransfers.value[index].progress = 100
          sftpTransfers.value[index].status = 'complete'
        }
        
        // Clean up event listeners
        socket.value.off('sftp-upload-complete', handleComplete)
        socket.value.off('sftp-upload-error', handleError)
        socket.value.off('sftp-error', handleError)
        
        resolve(result)
      }

      const handleError = (error) => {
        console.error('Upload error:', error)
        
        const index = sftpTransfers.value.findIndex(t => t.id === transferId)
        if (index !== -1) {
          sftpTransfers.value[index].status = 'error'
          sftpTransfers.value[index].error = error.message
        }
        
        // Clean up event listeners
        socket.value.off('sftp-upload-complete', handleComplete)
        socket.value.off('sftp-upload-error', handleError)
        socket.value.off('sftp-error', handleError)
        
        reject(new Error(error.message))
      }

      socket.value.on('sftp-upload-complete', handleComplete)
      socket.value.on('sftp-upload-error', handleError)
      socket.value.on('sftp-error', handleError)
    })
  }

  const createDirectory = (remotePath) => {
    if (!socket.value?.connected || !sftpConnected.value) {
      return Promise.reject(new Error('SFTP not connected'))
    }

    return new Promise((resolve, reject) => {
      socket.value.emit('sftp-create-directory', { remotePath })

      const handleSuccess = (result) => {
        console.log('Directory created:', result)
        
        // Clean up event listeners
        socket.value.off('sftp-directory-created', handleSuccess)
        socket.value.off('sftp-error', handleError)
        
        resolve(result)
      }

      const handleError = (error) => {
        console.error('Create directory error:', error)
        
        // Clean up event listeners
        socket.value.off('sftp-directory-created', handleSuccess)
        socket.value.off('sftp-error', handleError)
        
        reject(new Error(error.message))
      }

      socket.value.on('sftp-directory-created', handleSuccess)
      socket.value.on('sftp-error', handleError)
    })
  }

  const deleteFile = (remotePath) => {
    if (!socket.value?.connected || !sftpConnected.value) {
      return Promise.reject(new Error('SFTP not connected'))
    }

    return new Promise((resolve, reject) => {
      socket.value.emit('sftp-delete-file', { remotePath })

      const handleSuccess = (result) => {
        console.log('File deleted:', result)
        
        // Clean up event listeners
        socket.value.off('sftp-file-deleted', handleSuccess)
        socket.value.off('sftp-error', handleError)
        
        resolve(result)
      }

      const handleError = (error) => {
        console.error('Delete file error:', error)
        
        // Clean up event listeners
        socket.value.off('sftp-file-deleted', handleSuccess)
        socket.value.off('sftp-error', handleError)
        
        reject(new Error(error.message))
      }

      socket.value.on('sftp-file-deleted', handleSuccess)
      socket.value.on('sftp-error', handleError)
    })
  }

  const deleteDirectory = (remotePath) => {
    if (!socket.value?.connected || !sftpConnected.value) {
      return Promise.reject(new Error('SFTP not connected'))
    }

    return new Promise((resolve, reject) => {
      socket.value.emit('sftp-delete-directory', { remotePath })

      const handleSuccess = (result) => {
        console.log('Directory deleted:', result)
        
        // Clean up event listeners
        socket.value.off('sftp-directory-deleted', handleSuccess)
        socket.value.off('sftp-error', handleError)
        
        resolve(result)
      }

      const handleError = (error) => {
        console.error('Delete directory error:', error)
        
        // Clean up event listeners
        socket.value.off('sftp-directory-deleted', handleSuccess)
        socket.value.off('sftp-error', handleError)
        
        reject(new Error(error.message))
      }

      socket.value.on('sftp-directory-deleted', handleSuccess)
      socket.value.on('sftp-error', handleError)
    })
  }

  const renameFile = (oldPath, newPath) => {
    if (!socket.value?.connected || !sftpConnected.value) {
      return Promise.reject(new Error('SFTP not connected'))
    }

    return new Promise((resolve, reject) => {
      socket.value.emit('sftp-rename-file', { oldPath, newPath })

      const handleSuccess = (result) => {
        console.log('File renamed:', result)
        
        // Clean up event listeners
        socket.value.off('sftp-file-renamed', handleSuccess)
        socket.value.off('sftp-error', handleError)
        
        resolve(result)
      }

      const handleError = (error) => {
        console.error('Rename file error:', error)
        
        // Clean up event listeners
        socket.value.off('sftp-file-renamed', handleSuccess)
        socket.value.off('sftp-error', handleError)
        
        reject(new Error(error.message))
      }

      socket.value.on('sftp-file-renamed', handleSuccess)
      socket.value.on('sftp-error', handleError)
    })
  }

  const clearSftpError = () => {
    sftpConnectionError.value = null
  }

  // When terminal disconnects, also disconnect SFTP
  const disconnectAll = () => {
    disconnectSession()
    disconnectSftp()
  }

  // Initialize connection and authentication
  const init = async () => {
    try {
      await connectSocket()
      await authenticateSocket()
      return { success: true }
    } catch (error) {
      console.error('Terminal store initialization failed:', error)
      return { success: false, error: error.message }
    }
  }

  const setupSftpListeners = () => {
    if (!socket.value) return

    // Handle SFTP disconnection
    socket.value.on('sftp-disconnected', () => {
      console.log('SFTP disconnected')
      sftpConnected.value = false
      sftpConnectionId.value = null
      sftpCurrentPath.value = '.'
      sftpDirectoryContents.value = []
    })

    // Handle general SFTP errors
    socket.value.on('sftp-error', (error) => {
      console.error('SFTP error:', error)
      sftpConnectionError.value = error.message
    })
  }

  return {
    // State
    socket,
    isConnected,
    isConnecting,
    connectionError,
    activeSession,
    terminalOutput,
    connectionId,
    
    // SFTP state
    sftpConnected,
    sftpConnecting,
    sftpConnectionError,
    sftpConnectionId,
    sftpCurrentPath,
    sftpDirectoryContents,
    sftpTransfers,
    
    // Getters
    socketConnected,
    connecting,
    hasActiveSession,
    error,
    
    // SFTP getters
    hasSftpConnection,
    sftpConnectingStatus,
    sftpError,
    currentDirectory,
    directoryContents,
    activeTransfers,
    
    // Terminal actions
    connectSocket,
    authenticateSocket,
    connectToSession,
    disconnectSession,
    sendInput,
    resizeTerminal,
    setupTerminalListeners,
    getConnectionStatus,
    clearError,
    resetTerminalState,
    disconnectAll,
    ping,
    init,
    getUserConnections,
    attachToConnection,
    
    // SFTP actions
    connectToSftp,
    disconnectSftp,
    listDirectory,
    downloadFile,
    uploadFile,
    createDirectory,
    deleteFile,
    deleteDirectory,
    renameFile,
    clearSftpError,
    setupSftpListeners
  }
})
