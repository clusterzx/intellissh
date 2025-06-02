<template>
  <div class="h-screen flex flex-col bg-terminal-bg dark:bg-terminal-bgDark transition-colors duration-200">
    <!-- Header -->
    <div class="flex-shrink-0 bg-slate-800/90 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 dark:border-slate-800/80 shadow-sm z-10">
      <div class="flex items-center justify-between px-4 py-3">
        <div class="flex items-center space-x-4">
          <a
            href="/"
            class="text-slate-300 hover:text-white transition-colors rounded-full p-1.5 hover:bg-slate-700/50"
            @click.prevent="hardRedirect"
            aria-label="Back to Sessions"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </a>
          
          <div class="text-white">
            <div class="flex items-center">
              <h1 v-if="currentSession" class="font-medium">
                {{ currentSession.name }}
              </h1>
              <span 
                v-if="terminalStore.hasActiveSession" 
                class="ml-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              >
                <span class="w-1.5 h-1.5 mr-1.5 rounded-full bg-green-500 dark:bg-green-400 animate-pulse"></span>
                Live
              </span>
            </div>
            <p v-if="currentSession" class="text-sm text-slate-300 dark:text-slate-400 mt-0.5">
              {{ currentSession.username }}@{{ currentSession.hostname }}:{{ currentSession.port }}
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-4">
          <!-- Dark Mode Toggle -->
          <DarkModeToggle />
          
          <!-- Connection Status -->
          <div class="hidden md:flex items-center space-x-2">
            <div
              :class="{
                'status-connected': terminalStore.hasActiveSession,
                'status-connecting': terminalStore.connecting,
                'status-disconnected': !terminalStore.hasActiveSession && !terminalStore.connecting
              }"
              class="status-indicator"
            ></div>
            <span class="text-sm text-slate-300 dark:text-slate-400">
              {{
                terminalStore.hasActiveSession
                  ? 'Connected'
                  : terminalStore.connecting
                  ? 'Connecting...'
                  : 'Disconnected'
              }}
            </span>
          </div>

          <!-- Actions -->
          <div class="flex items-center space-x-2">
            <button
              v-if="!terminalStore.hasActiveSession && !terminalStore.connecting"
              @click="connect"
              class="btn-primary text-sm py-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
              </svg>
              Connect
            </button>
            <button
              v-if="terminalStore.hasActiveSession"
              @click="disconnect"
              class="btn-secondary text-sm py-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
              </svg>
              Disconnect
            </button>
          </div>
          
          <!-- Sidebar Toggle for both Mobile and Desktop -->
          <button 
            v-if="terminalStore.hasActiveSession" 
            @click="showSidebar = !showSidebar"
            class="rounded-md p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            :aria-expanded="showSidebar"
            aria-controls="llm-sidebar"
          >
            <span class="sr-only">{{ showSidebar ? 'Hide' : 'Show' }} AI Assistant</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" :class="{'rotate-180': showSidebar}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path v-if="!showSidebar" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content Area - Split between Terminal and LLM Helper -->
    <div class="flex-1 flex flex-col md:flex-row overflow-hidden relative">
      <!-- Terminal Container -->
      <div class="flex-1 relative min-h-0" :class="{'md:pr-96': showSidebar && !isMobile}">
        <!-- Loading State -->
        <div
          v-if="loading"
          class="absolute inset-0 bg-terminal-bg dark:bg-terminal-bgDark bg-opacity-90 dark:bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-10"
        >
          <div class="text-center bg-slate-800/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl p-6 shadow-lg animate-fade-in">
            <div class="spinner mx-auto mb-4 text-indigo-500 dark:text-indigo-400 h-8 w-8 border-2"></div>
            <p class="text-white">{{ loadingMessage }}</p>
          </div>
        </div>

        <!-- Error State -->
        <div
          v-if="error && !terminalStore.hasActiveSession"
          class="absolute inset-0 bg-terminal-bg dark:bg-terminal-bgDark flex items-center justify-center"
        >
          <div class="text-center max-w-md p-6 bg-slate-800/90 dark:bg-slate-900/90 rounded-xl shadow-lg animate-fade-in">
            <div class="bg-red-500/10 dark:bg-red-500/20 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg class="h-10 w-10 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 class="text-lg font-medium text-white mb-2">Connection Failed</h3>
            <p class="text-slate-300 dark:text-slate-400 mb-6">{{ error }}</p>
            <button @click="connect" class="btn-primary">
              Try Again
            </button>
          </div>
        </div>

        <!-- Session Selection -->
        <div
          v-if="!sessionId && !currentSession"
          class="absolute inset-0 bg-terminal-bg dark:bg-terminal-bgDark flex items-center justify-center"
        >
          <div class="text-center max-w-md p-6 bg-slate-800/90 dark:bg-slate-900/90 rounded-xl shadow-lg animate-fade-in">
            <div class="bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg class="h-10 w-10 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
            </div>
            <h3 class="text-xl font-medium text-white mb-2">No Session Selected</h3>
            <p class="text-slate-300 dark:text-slate-400 mb-6">Select a session to start a terminal connection.</p>
            <a href="/" @click.prevent="hardRedirect" class="btn-primary">
              View Sessions
            </a>
          </div>
        </div>

        <!-- Terminal -->
        <div
          v-show="terminalReady"
          ref="terminalContainer"
          class="h-full w-full terminal-container"
        ></div>
      </div>

      <!-- LLM Helper Sidebar -->
      <div 
        id="llm-sidebar"
        v-if="terminalStore.hasActiveSession" 
        :class="[
          'transition-all duration-300 ease-in-out overflow-hidden',
          'md:absolute md:top-0 md:bottom-0 md:right-0 md:border-l md:border-slate-700/50 dark:md:border-slate-800/80 md:shadow-lg',
          'z-20',
          showSidebar ? 'md:w-96 w-full visible' : 'md:w-0 w-0 invisible',
          isMobile ? 'fixed inset-0' : ''
        ]"
      >
        <div class="h-full overflow-auto bg-white dark:bg-slate-800 md:bg-slate-100 md:dark:bg-slate-800">
          <LLMHelper />
        </div>
        
        <!-- Mobile Only: Floating Close Button -->
        <button 
          v-if="showSidebar && isMobile" 
          @click="showSidebar = false"
          class="md:hidden fixed top-3 right-3 z-30 bg-slate-800 text-white rounded-full p-2 shadow-lg"
          aria-label="Close AI Assistant"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Floating AI assistant toggle button (for mobile when closed) -->
      <button 
        v-if="terminalStore.hasActiveSession && !showSidebar && isMobile" 
        @click="showSidebar = true"
        class="md:hidden fixed bottom-6 right-6 z-20 bg-indigo-600 text-white rounded-full p-3 shadow-lg"
        aria-label="Open AI Assistant"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { useTerminalStore } from '@/stores/terminalStore'
import { useSessionStore } from '@/stores/sessionStore'
import LLMHelper from '@/components/LLMHelper.vue'
import DarkModeToggle from '@/components/DarkModeToggle.vue'
import html2canvas from 'html2canvas'

// Props
const props = defineProps({
  sessionId: {
    type: String,
    default: null
  }
})

// Stores and router
const terminalStore = useTerminalStore()
const sessionStore = useSessionStore()
const route = useRoute()
const router = useRouter()

// State
const terminalContainer = ref(null)
const terminal = ref(null)
const fitAddon = ref(null)
const loading = ref(false)
const loadingMessage = ref('')
const error = ref('')
const terminalReady = ref(false)
const currentSession = ref(null)
const showSidebar = ref(false) // Start collapsed on all screen sizes
const isMobile = ref(window.innerWidth < 768)

// Computed session ID
const sessionId = computed(() => props.sessionId || route.params.sessionId)

// Check if we're in dark mode
const isDarkMode = computed(() => document.documentElement.classList.contains('dark'))

// Methods
const hardRedirect = () => {
  // Disconnect from current session
  if (terminalStore.hasActiveSession) {
    disconnect()
  }
  
  // Perform a hard redirect to root URL
  window.location.href = '/'
}

const initializeTerminal = () => {
  if (terminal.value) {
    terminal.value.dispose()
  }

  const darkMode = isDarkMode.value

  terminal.value = new Terminal({
    cursorBlink: true,
    fontSize: 15,
    fontFamily: 'JetBrains Mono, Consolas, Monaco, "Courier New", monospace',
    lineHeight: 1.2,
    theme: {
      background: darkMode ? '#121212' : '#1e1e1e',
      foreground: '#f0f0f0',
      cursor: '#ffffff',
      selection: darkMode ? '#353a46' : '#264f78',
      black: '#000000',
      red: '#f14c4c',
      green: '#23d18b',
      yellow: '#f5f543',
      blue: '#3b8eea',
      magenta: '#d670d6',
      cyan: '#29b8db',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#e5e5e5'
    },
    allowTransparency: true,
    scrollback: 3000
  })

  fitAddon.value = new FitAddon()
  const webLinksAddon = new WebLinksAddon()

  terminal.value.loadAddon(fitAddon.value)
  terminal.value.loadAddon(webLinksAddon)

  terminal.value.open(terminalContainer.value)
  
  // Use nextTick to ensure the DOM has updated before fitting
  nextTick(() => {
    fitAddon.value.fit()
    // Force a second fit after a short delay to ensure proper sizing
    setTimeout(() => {
      fitAddon.value.fit()
    }, 100)
  })

  // Set up terminal event handlers
  terminal.value.onData((data) => {
    terminalStore.sendInput(data)
  })

  terminal.value.onResize((size) => {
    terminalStore.resizeTerminal(size)
  })

  // Set up terminal store listeners
  terminalStore.setupTerminalListeners(terminal.value)

  terminalReady.value = true
}

const loadSession = async () => {
  if (!sessionId.value) return

  loading.value = true
  loadingMessage.value = 'Loading session...'

  try {
    const result = await sessionStore.getSession(sessionId.value)
    if (result.success) {
      currentSession.value = result.session
    } else {
      throw new Error(result.error || 'Failed to load session')
    }
  } catch (err) {
    error.value = err.message
    console.error('Failed to load session:', err)
  } finally {
    loading.value = false
  }
}

const connect = async () => {
  if (!sessionId.value) {
    error.value = 'No session selected'
    return
  }

  loading.value = true
  loadingMessage.value = 'Connecting to SSH session...'
  error.value = ''

  try {
    // Initialize terminal store if not connected
    if (!terminalStore.socketConnected) {
      await terminalStore.init()
    }

    // Connect to the SSH session
    await terminalStore.connectToSession(sessionId.value)

    // Initialize terminal if not ready
    if (!terminalReady.value) {
      await nextTick()
      initializeTerminal()
    }

    // Focus terminal
    terminal.value?.focus()
  } catch (err) {
    error.value = err.message || 'Failed to connect to SSH session'
    console.error('Connection failed:', err)
  } finally {
    loading.value = false
  }
}

const captureTerminalSnapshot = async () => {
  if (!terminalContainer.value || !currentSession.value || !terminalReady.value) {
    return null
  }
  
  try {
    console.log('Capturing terminal snapshot...')
    const canvas = await html2canvas(terminalContainer.value, {
      backgroundColor: isDarkMode.value ? '#121212' : '#1e1e1e',
      scale: 0.75, // Reduce size for storage efficiency
      logging: false,
      useCORS: true
    })
    
    const snapshotData = canvas.toDataURL('image/jpeg', 0.7) // Use JPEG with compression to reduce size
    console.log('Terminal snapshot captured successfully')
    return snapshotData
  } catch (error) {
    console.error('Failed to capture terminal snapshot:', error)
    return null
  }
}

const disconnect = async () => {
  // Capture terminal snapshot before disconnecting
  if (terminalStore.hasActiveSession && terminalReady.value && currentSession.value) {
    try {
      const snapshotData = await captureTerminalSnapshot()
      if (snapshotData) {
        // Save snapshot to the server
        await sessionStore.saveConsoleSnapshot(currentSession.value.id, snapshotData)
        console.log('Terminal snapshot saved for session:', currentSession.value.id)
      }
    } catch (error) {
      console.error('Failed to save terminal snapshot:', error)
    }
  }
  
  // Disconnect session
  terminalStore.disconnectSession()
  if (terminal.value) {
    terminal.value.clear()
  }
}

const handleResize = () => {
  if (fitAddon.value && terminalReady.value) {
    fitAddon.value.fit()
  }
  
  // Update mobile state
  isMobile.value = window.innerWidth < 768
  // Keep sidebar state as is, don't force it to show on desktop anymore
}

// Watch for dark mode changes
watch(() => isDarkMode.value, () => {
  if (terminalReady.value && terminal.value) {
    // Re-initialize terminal with new theme
    initializeTerminal()
  }
}, { immediate: true })

// Watch for sidebar toggle to resize terminal
watch(() => showSidebar.value, () => {
  if (fitAddon.value && terminalReady.value) {
    // Use nextTick to ensure the DOM has updated before fitting
    nextTick(() => {
      // Small delay to ensure layout transition is complete
      setTimeout(() => {
        fitAddon.value.fit()
      }, 350) // Match the sidebar transition duration (300ms) + small buffer
    })
  }
})

// Watchers
watch(() => terminalStore.error, (newError) => {
  if (newError) {
    error.value = newError
  }
})

watch(() => terminalStore.hasActiveSession, (hasSession) => {
  if (!hasSession && terminal.value) {
    terminal.value.clear()
  }
})

// Watch for changes in sessionId from route params
watch(() => route.params.sessionId, async (newSessionId, oldSessionId) => {
  if (newSessionId !== oldSessionId) {
    // Disconnect from current session if connected
    if (terminalStore.hasActiveSession) {
      disconnect()
    }
    
    // Reset terminal state
    terminalReady.value = false
    currentSession.value = null
    
    // Load new session data and connect
    await loadSession()
    if (currentSession.value) {
      await connect()
    }
  }
}, { immediate: false })

// Lifecycle
onMounted(async () => {
  // Load session data
  await loadSession()

  // Auto-connect if session is available
  if (currentSession.value) {
    await connect()
  }

  // Set up resize handler
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  // Clean up
  window.removeEventListener('resize', handleResize)
  
  if (terminal.value) {
    terminal.value.dispose()
  }
  
  // Disconnect from session
  terminalStore.disconnectSession()
})
</script>

<style scoped>
/* Terminal specific styles are in main.css */
</style>
