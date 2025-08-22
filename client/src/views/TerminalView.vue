<template>
  <div class="fixed inset-0 flex flex-col bg-terminal-bg dark:bg-terminal-bgDark transition-colors duration-200 overflow-hidden">
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
                {{ $t('message.live') }}
              </span>
              <span class="ml-3 text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                v{{ appVersion }}
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
                  ? $t('message.connected')
                  : terminalStore.connecting
                  ? $t('message.connecting')
                  : $t('message.disconnected')
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
              {{ $t('message.connect') }}
            </button>
            <button
              v-if="terminalStore.hasActiveSession"
              @click="disconnect"
              class="btn-secondary text-sm py-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
              </svg>
              {{ $t('message.disconnected') }}
            </button>
          </div>
          <!-- SFTP File Browser Toggle -->
          <button 
            v-if="terminalStore.hasActiveSession" 
            @click="toggleSftpSidebar"
            class="rounded-md p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            :aria-expanded="showSftpSidebar"
            aria-controls="sftp-sidebar"
            :class="{'bg-slate-700': showSftpSidebar}"
          >
            <span class="sr-only">{{ showSftpSidebar ? 'Hide' : 'Show' }} SFTP Browser</span>
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
          </button>
          
          <!-- AI Assistant Toggle -->
          <button 
            v-if="terminalStore.hasActiveSession" 
            @click="toggleLlmSidebar"
            class="rounded-md p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            :aria-expanded="showSidebar"
            aria-controls="llm-sidebar"
            :class="{'bg-slate-700': showSidebar}"
          >
            <span class="sr-only">{{ showSidebar ? 'Hide' : 'Show' }} AI Assistant</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content Area - Split between Terminal and Sidebars -->
    <div class="flex-1 flex flex-col md:flex-row overflow-hidden relative">
      <!-- Terminal Container -->
      <div class="flex-1 relative min-h-0" :class="{'md:pr-96': (showSidebar || showSftpSidebar) && !isMobile}">
        <!-- Loading State -->
        <div
          v-if="loading"
          class="absolute inset-0 bg-terminal-bg dark:bg-terminal-bgDark bg-opacity-90 dark:bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-10"
        >
          <div class="text-center bg-slate-800/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl p-6 shadow-lg animate-fade-in">
            <div class="spinner mx-auto mb-4 text-indigo-500 dark:text-indigo-400 h-8 w-8 border-2"></div>
            <p class="text-white">{{ $t('message.loading_session') }}</p>
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
            <h3 class="text-lg font-medium text-white mb-2">{{ $t('message.connection_failed') }}</h3>
            <p class="text-slate-300 dark:text-slate-400 mb-6">{{ error }}</p>
            <button @click="connect" class="btn-primary">
              {{ $t('message.try_again') }}
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
            <h3 class="text-xl font-medium text-white mb-2">{{ $t('message.no_session_selected') }}</h3>
            <p class="text-slate-300 dark:text-slate-400 mb-6">{{ $t('message.select_session_to_connect') }}</p>
            <a href="/" @click.prevent="hardRedirect" class="btn-primary">
              {{ $t('message.view_sessions') }}
            </a>
          </div>
        </div>

      <!-- Terminal -->
      <div
        v-show="terminalReady"
        ref="terminalContainer"
        class="h-full w-full terminal-container"
        @contextmenu.prevent="handleContextMenu"
      ></div>
      
      <!-- Context Menu for Copy/Paste -->
      <div
        v-show="contextMenuVisible"
        class="absolute bg-slate-800 border border-slate-700 rounded shadow-lg z-50 py-1"
        :style="`top: ${contextMenuY}px; left: ${contextMenuX}px;`"
      >
        <button
          class="w-full text-left px-4 py-2 text-white hover:bg-slate-700 text-sm flex items-center"
          @click="copySelectedText"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" />
          </svg>
          {{ $t('message.copy') }}
        </button>
        <button
          class="w-full text-left px-4 py-2 text-white hover:bg-slate-700 text-sm flex items-center"
          @click="pasteFromClipboard"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          {{ $t('message.paste') }}
        </button>
      </div>
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

      <!-- SFTP File Browser Sidebar -->
      <div 
        id="sftp-sidebar"
        v-if="terminalStore.hasActiveSession" 
        :class="[
          'transition-all duration-300 ease-in-out overflow-hidden',
          'md:absolute md:top-0 md:bottom-0 md:right-0 md:border-l md:border-slate-700/50 dark:md:border-slate-800/80 md:shadow-lg',
          'z-20',
          showSftpSidebar ? 'md:w-96 w-full visible' : 'md:w-0 w-0 invisible',
          isMobile ? 'fixed inset-0' : ''
        ]"
      >
        <div class="h-full overflow-auto bg-white dark:bg-slate-800 md:bg-slate-100 md:dark:bg-slate-800">
          <SftpFileBrowser />
        </div>
        
        <!-- Mobile Only: Floating Close Button -->
        <button 
          v-if="showSftpSidebar && isMobile" 
          @click="showSftpSidebar = false"
          class="md:hidden fixed top-3 right-3 z-30 bg-slate-800 text-white rounded-full p-2 shadow-lg"
          aria-label="Close SFTP Browser"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Floating SFTP browser toggle button (for mobile when closed) -->
      <button 
        v-if="terminalStore.hasActiveSession && !showSftpSidebar && isMobile" 
        @click="showSftpSidebar = true"
        class="md:hidden fixed bottom-6 left-6 z-20 bg-cyan-600 text-white rounded-full p-3 shadow-lg"
        aria-label="Open SFTP File Browser"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { APP_VERSION } from '@/utils/constants'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'

import { useTerminalStore } from '@/stores/terminalStore'
import { useSessionStore } from '@/stores/sessionStore'
import LLMHelper from '@/components/LLMHelper.vue'
import SftpFileBrowser from '@/components/SftpFileBrowser.vue'
import DarkModeToggle from '@/components/DarkModeToggle.vue'
import html2canvas from 'html2canvas'
import { useI18n } from 'vue-i18n'

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
const { t } = useI18n()

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
const showSftpSidebar = ref(false) // SFTP sidebar toggle state
const isMobile = ref(window.innerWidth < 768)
const appVersion = ref(APP_VERSION)

// Sidebar toggle methods
const toggleLlmSidebar = () => {
  showSidebar.value = !showSidebar.value
  if (showSidebar.value && showSftpSidebar.value) {
    showSftpSidebar.value = false // Close SFTP sidebar when opening LLM sidebar
  }
}

const toggleSftpSidebar = () => {
  showSftpSidebar.value = !showSftpSidebar.value
  if (showSftpSidebar.value && showSidebar.value) {
    showSidebar.value = false // Close LLM sidebar when opening SFTP sidebar
  }
}

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

// Context menu for copy/paste
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const selectedText = ref('')

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
  
  // Initialize the terminal UI
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
  loadingMessage.value = t('message.loading_session')

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
    error.value = t('message.no_session_selected')
    return
  }

  loading.value = true
  loadingMessage.value = t('message.connecting')
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
    error.value = err.message || t('message.connection_failed')
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
  console.log('Disconnect button clicked.');
  // Capture terminal snapshot before disconnecting
  if (terminalStore.hasActiveSession && terminalReady.value && currentSession.value) {
    try {
      console.log('Attempting to capture terminal snapshot...');
      const snapshotData = await captureTerminalSnapshot();
      if (snapshotData) {
        console.log('Snapshot captured, attempting to save...');
        // Save snapshot to the server
        await sessionStore.saveConsoleSnapshot(currentSession.value.id, snapshotData);
        console.log('Terminal snapshot saved for session:', currentSession.value.id);
      } else {
        console.warn('No snapshot data captured.');
      }
    } catch (error) {
      console.error('Failed to save terminal snapshot:', error);
    }
  }
  
  // Disconnect session
  console.log('Calling terminalStore.disconnectSession()...');
  await terminalStore.disconnectSession();
  console.log('Disconnect process initiated.');

  // Redirect to homepage after successful disconnection
  router.push('/');
};

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

// Watch for sidebar toggles to resize terminal
watch([() => showSidebar.value, () => showSftpSidebar.value], () => {
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
// Context menu handling
const handleContextMenu = (event) => {
  if (!terminal.value) return
  
  // Position the context menu
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  
  // Get selected text from terminal if any
  selectedText.value = terminal.value.getSelection()
  
  // Show the context menu
  contextMenuVisible.value = true
  
  // Add event listener to close the context menu when clicking elsewhere
  document.addEventListener('click', closeContextMenu)
}

const closeContextMenu = () => {
  contextMenuVisible.value = false
  document.removeEventListener('click', closeContextMenu)
}

const copySelectedText = () => {
  if (selectedText.value) {
    navigator.clipboard.writeText(selectedText.value)
      .then(() => {
        console.log(t('message.text_copied'))
      })
      .catch(err => {
        console.error(t('message.failed_to_copy'), err)
      })
  }
  closeContextMenu()
}

const pasteFromClipboard = () => {
  navigator.clipboard.readText()
    .then(text => {
      if (text && terminal.value) {
        terminalStore.sendInput(text)
      }
    })
    .catch(err => {
      console.error(t('message.failed_to_paste'), err)
    })
  closeContextMenu()
}

const handleKeydown = (e) => {
  // Only process if terminal is focused
  if (!terminal.value || !document.activeElement.closest('.terminal-container')) return
  
  // Ctrl+C or Command+C to copy
  if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.shiftKey) {
    const selection = terminal.value.getSelection()
    if (selection) {
      navigator.clipboard.writeText(selection)
      e.preventDefault()
    }
  }
  
  // Ctrl+V or Command+V to paste
  if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
    navigator.clipboard.readText()
      .then(text => {
        if (text && terminal.value) {
          terminalStore.sendInput(text)
        }})
      e.preventDefault()
    }
  }


onMounted(async () => {
  // Load session data
  await loadSession()

  // Auto-connect if session is available
  if (currentSession.value) {
    await connect()
  }

  // Set up resize handler
  window.addEventListener('resize', handleResize)
  
  // Add keyboard shortcuts for copy/paste
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  // Clean up
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('click', closeContextMenu)
  document.removeEventListener('keydown', handleKeydown)

  // console.log('TerminalView: onUnmounted - Starting dispose operations.');

  // Dispose of addons only if they were loaded
  if (fitAddon.value) {
    try { // Add try-catch for fitAddon
      // console.log('TerminalView: Disposing fitAddon.');
      fitAddon.value.dispose();
      fitAddon.value = null; // Set to null after disposing
    } catch (e) {
      // console.error('TerminalView: Error disposing fitAddon:', e);
    }
  }
  
  // Then dispose of the terminal
  if (terminal.value) {
    // console.log('TerminalView: Disposing terminal instance.');
    terminal.value.dispose()
    terminal.value = null; // Set to null after disposing
  }
  // console.log('TerminalView: onUnmounted - Dispose operations completed.');

  // Force a page reload to ensure the HomeView renders correctly
  // This is a workaround for unhandled errors during component unmount
  // that might prevent Vue from updating the DOM.
  window.location.reload();
})
</script>

<style scoped>
/* Terminal specific styles are in main.css */
</style>
