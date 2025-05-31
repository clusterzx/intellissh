import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useTerminalStore } from './terminalStore'

export const useLLMHelperStore = defineStore('llmHelper', () => {
  // State
  const enabled = ref(false)
  const isProcessing = ref(false)
  const settings = ref({
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    availableProviders: [],
    availableModels: {}
  })
  const lastResponse = ref(null)
  const lastCommand = ref(null)
  const error = ref(null)
  const history = ref([])
  const pendingCommand = ref(null) // To store command waiting for approval

  // Getters
  const isEnabled = computed(() => enabled.value)
  const isReady = computed(() => {
    const terminalStore = useTerminalStore()
    return terminalStore.hasActiveSession
  })

  // Actions
  const toggleHelper = async (value) => {
    const terminalStore = useTerminalStore()
    if (!terminalStore.socket?.connected || !terminalStore.hasActiveSession) {
      error.value = 'Terminal not connected'
      return false
    }

    enabled.value = value
    terminalStore.socket.emit('toggle-llm-helper', { enabled: value })
    return true
  }

  const sendManualPrompt = async (prompt) => {
    const terminalStore = useTerminalStore()
    if (!terminalStore.socket?.connected || !terminalStore.hasActiveSession) {
      error.value = 'Terminal not connected'
      return false
    }

    if (!enabled.value) {
      error.value = 'LLM Helper is disabled'
      return false
    }

    isProcessing.value = true
    try {
      terminalStore.socket.emit('llm-manual-prompt', { prompt })
      // Response will be handled by socket events
      return true
    } catch (err) {
      error.value = err.message
      return false
    } finally {
      isProcessing.value = false
    }
  }

  const fetchSettings = async () => {
    const terminalStore = useTerminalStore()
    if (!terminalStore.socket?.connected) {
      error.value = 'Terminal not connected'
      return false
    }

    terminalStore.socket.emit('get-llm-settings')
    return true
  }

  const setupSocketListeners = () => {
    const terminalStore = useTerminalStore()
    if (!terminalStore.socket) return

    terminalStore.socket.on('llm-helper-status', (data) => {
      enabled.value = data.enabled
    })

    // Listen for LLM processing status updates
    terminalStore.socket.on('llm-processing-start', () => {
      console.log('LLM processing started')
      isProcessing.value = true
    })
    
    terminalStore.socket.on('llm-processing-end', () => {
      console.log('LLM processing ended')
      // Don't set isProcessing to false here, as we'll do that when we receive the response
    })
    
    terminalStore.socket.on('llm-response', (data) => {
      lastResponse.value = data
      history.value.push({
        type: 'response',
        content: data,
        timestamp: new Date().toISOString()
      })
      isProcessing.value = false
    })

    terminalStore.socket.on('llm-executed-command', (data) => {
      lastCommand.value = data
      history.value.push({
        type: 'command',
        content: data,
        timestamp: new Date().toISOString()
      })
    })

    terminalStore.socket.on('llm-error', (data) => {
      error.value = data.message
      isProcessing.value = false
    })

    terminalStore.socket.on('llm-settings', (data) => {
      settings.value = data
    })
    
    // Listen for command suggestions that require approval
    terminalStore.socket.on('llm-command-suggestion', (data) => {
      pendingCommand.value = data
      history.value.push({
        type: 'suggestion',
        content: data,
        timestamp: new Date().toISOString()
      })
    })
    
    // Listen for executed command confirmations
    terminalStore.socket.on('llm-command-executed', (data) => {
      pendingCommand.value = null
      lastCommand.value = data
      history.value.push({
        type: 'executed',
        content: data,
        timestamp: new Date().toISOString()
      })
    })
  }

  const clearHistory = () => {
    history.value = []
    lastResponse.value = null
    lastCommand.value = null
  }

  const clearError = () => {
    error.value = null
  }
  
  // Execute a command that was suggested by the LLM
  const approveCommand = async () => {
    const terminalStore = useTerminalStore()
    if (!terminalStore.socket?.connected || !terminalStore.hasActiveSession) {
      error.value = 'Terminal not connected'
      return false
    }

    if (!pendingCommand.value) {
      error.value = 'No command pending approval'
      return false
    }

    try {
      terminalStore.socket.emit('execute-approved-command', { 
        command: pendingCommand.value.command 
      })
      return true
    } catch (err) {
      error.value = err.message
      return false
    }
  }
  
  // Reject a command that was suggested by the LLM
  const rejectCommand = () => {
    // Just clear the pending command without executing it
    pendingCommand.value = null;
    
    history.value.push({
      type: 'rejected',
      content: { message: 'Command rejected by user' },
      timestamp: new Date().toISOString()
    });
    
    return true;
  }
  
  // Manually trigger analysis of the current terminal output
  const analyzeLastTerminalOutput = async () => {
    const terminalStore = useTerminalStore();
    if (!terminalStore.socket?.connected || !terminalStore.hasActiveSession) {
      error.value = 'Terminal not connected';
      return false;
    }

    if (!enabled.value) {
      error.value = 'LLM Helper is not enabled';
      return false;
    }

    isProcessing.value = true;
    try {
      terminalStore.socket.emit('llm-analyze-terminal');
      // Response will be handled by socket events
      return true;
    } catch (err) {
      error.value = err.message;
      return false;
    } finally {
      // isProcessing.value will be set to false when we receive the response
    }
  }

  // Methods for handling history items
  const setPendingCommandFromHistory = (commandData) => {
    pendingCommand.value = commandData;
  }
  
  const removeHistoryItem = (item) => {
    const index = history.value.findIndex(i => i === item);
    if (index !== -1) {
      history.value.splice(index, 1);
    }
  }

  return {
    // State
    enabled,
    isProcessing,
    settings,
    lastResponse,
    lastCommand,
    error,
    history,
    pendingCommand,
    
    // Getters
    isEnabled,
    isReady,
    
    // Actions
    toggleHelper,
    sendManualPrompt,
    fetchSettings,
    setupSocketListeners,
    clearHistory,
    clearError,
    approveCommand,
    rejectCommand,
    analyzeLastTerminalOutput,
    setPendingCommandFromHistory,
    removeHistoryItem
  }
})
