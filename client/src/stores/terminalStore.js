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

  // Getters
  const socketConnected = computed(() => isConnected.value)
  const connecting = computed(() => isConnecting.value)
  const hasActiveSession = computed(() => !!activeSession.value)
  const error = computed(() => connectionError.value)

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

  const connectToSession = async (sessionId) => {
    if (!socket.value?.connected) {
      throw new Error('Socket not connected')
    }

    isConnecting.value = true
    connectionError.value = null

    return new Promise((resolve, reject) => {
      socket.value.emit('connect-session', { sessionId })

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

  const disconnectSession = () => {
    if (socket.value && activeSession.value) {
      socket.value.emit('disconnect-session')
      activeSession.value = null
      connectionId.value = null
    }
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
      activeSession.value = null
      connectionId.value = null
      
      if (terminal && typeof terminal.write === 'function') {
        terminal.write('\r\n\x1b[31mConnection closed.\x1b[0m\r\n')
      }
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

  const disconnect = () => {
    if (socket.value) {
      disconnectSession()
      socket.value.disconnect()
      socket.value = null
    }
    
    isConnected.value = false
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

  return {
    // State
    socket,
    isConnected,
    isConnecting,
    connectionError,
    activeSession,
    terminalOutput,
    connectionId,
    
    // Getters
    socketConnected,
    connecting,
    hasActiveSession,
    error,
    
    // Actions
    connectSocket,
    authenticateSocket,
    connectToSession,
    disconnectSession,
    sendInput,
    resizeTerminal,
    setupTerminalListeners,
    getConnectionStatus,
    clearError,
    disconnect,
    ping,
    init
  }
})
