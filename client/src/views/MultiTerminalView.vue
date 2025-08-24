<template>
  <div class="fixed inset-0 flex flex-col bg-terminal-bg dark:bg-terminal-bgDark transition-colors duration-200 overflow-hidden">
    <!-- Header -->
    <div class="flex-shrink-0 bg-slate-800/90 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 dark:border-slate-800/80 shadow-sm z-10">
      <div class="flex items-center justify-between px-4 py-2">
        <div class="flex items-center space-x-4">
          <a
            href="/"
            class="text-slate-300 hover:text-white transition-colors rounded-full p-1.5 hover:bg-slate-700/50"
            @click.prevent="goHome"
            aria-label="Back to Sessions"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </a>
          
          <h1 class="text-lg font-medium text-white">{{ $t('message.ssh_sessions') }}</h1>
        </div>

        <div class="flex items-center space-x-4">
          <!-- Dark Mode Toggle -->
          <DarkModeToggle />
          
          <!-- Add New Tab Button -->
          <button
            v-if="tabsStore.canAddMoreTabs"
            @click="showSessionSelector = true"
            class="btn-primary text-sm py-1.5"
            :title="$t('message.new_tab')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Tabs Bar -->
      <div v-if="tabsStore.hasActiveTabs" class="flex items-center bg-slate-900/50 border-t border-slate-700/30 overflow-x-auto">
        <div class="flex flex-nowrap">
          <div
            v-for="tab in tabsStore.allTabs"
            :key="tab.id"
            :class="[
              'flex items-center px-4 py-2 border-r border-slate-700/30 cursor-pointer transition-all duration-200 min-w-[150px] max-w-[250px]',
              tab.id === tabsStore.activeTabId 
                ? 'bg-slate-700/50 text-white border-b-2 border-b-indigo-500' 
                : 'bg-slate-800/30 text-slate-400 hover:bg-slate-700/30 hover:text-slate-200'
            ]"
            @click="switchTab(tab.id)"
          >
            <div class="flex items-center flex-1 mr-2">
              <!-- Connection Status Indicator -->
              <div
                :class="{
                  'status-connected': tab.isConnected,
                  'status-connecting': tab.isConnecting,
                  'status-disconnected': !tab.isConnected && !tab.isConnecting
                }"
                class="status-indicator mr-2 flex-shrink-0"
              ></div>
              
              <!-- Tab Label -->
              <span class="text-sm truncate">
                {{ tab.sessionName || `${tab.username}@${tab.hostname}` }}
              </span>
            </div>
            
            <!-- Close Tab Button -->
            <button
              @click.stop="closeTab(tab.id)"
              class="ml-2 p-0.5 rounded hover:bg-slate-600/50 transition-colors"
              :title="$t('message.close_tab')"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 relative overflow-hidden">
      <!-- No Tabs Message -->
      <div v-if="!tabsStore.hasActiveTabs" class="absolute inset-0 flex items-center justify-center">
        <div class="text-center max-w-md p-6 bg-slate-800/90 dark:bg-slate-900/90 rounded-xl shadow-lg">
          <div class="bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <svg class="h-10 w-10 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 class="text-xl font-medium text-white mb-2">{{ $t('message.no_open_tabs') }}</h3>
          <p class="text-slate-300 dark:text-slate-400 mb-6">{{ $t('message.open_session_to_start') }}</p>
          <button @click="showSessionSelector = true" class="btn-primary">
            {{ $t('message.open_session') }}
          </button>
        </div>
      </div>
      
      <!-- Terminal Containers -->
      <div
        v-for="tab in tabsStore.allTabs"
        :key="tab.id"
        v-show="tab.id === tabsStore.activeTabId"
        :ref="el => terminalContainers[tab.id] = el"
        class="h-full w-full terminal-container"
        @contextmenu.prevent="handleContextMenu"
      ></div>
    </div>
    
    <!-- Session Selector Modal -->
    <div v-if="showSessionSelector" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div class="p-6 border-b border-slate-200 dark:border-slate-700">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-slate-900 dark:text-white">{{ $t('message.select_session') }}</h2>
            <button
              @click="showSessionSelector = false"
              class="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div class="p-6 overflow-y-auto max-h-[60vh]">
          <div v-if="availableSessions.length === 0" class="text-center py-8">
            <p class="text-slate-500 dark:text-slate-400">{{ $t('message.no_sessions_available') }}</p>
            <router-link to="/" class="btn-primary mt-4">
              {{ $t('message.manage_sessions') }}
            </router-link>
          </div>
          
          <div v-else class="grid gap-3">
            <div
              v-for="session in availableSessions"
              :key="session.id"
              @click="openSessionInNewTab(session)"
              class="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-medium text-slate-900 dark:text-white">{{ session.name }}</h3>
                  <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {{ session.username }}@{{ session.hostname }}:{{ session.port }}
                  </p>
                </div>
                <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Context Menu -->
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
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { useTerminalStore } from '@/stores/terminalStore'
import { useTerminalTabsStore } from '@/stores/terminalTabsStore'
import { useSessionStore } from '@/stores/sessionStore'
import DarkModeToggle from '@/components/DarkModeToggle.vue'
import { useI18n } from 'vue-i18n'

// Stores and router
const terminalStore = useTerminalStore()
const tabsStore = useTerminalTabsStore()
const sessionStore = useSessionStore()
const router = useRouter()
const { t } = useI18n()

// State
const terminalContainers = ref({})
const showSessionSelector = ref(false)
const availableSessions = ref([])
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const selectedText = ref('')

// Check if we're in dark mode
const isDarkMode = computed(() => document.documentElement.classList.contains('dark'))

// Initialize terminal for a tab
const initializeTabTerminal = async (tab) => {
  await nextTick()
  
  const container = terminalContainers.value[tab.id]
  if (!container) {
    console.error('Terminal container not found for tab:', tab.id)
    return
  }
  
  // Create terminal instance
  const terminal = new Terminal({
    cursorBlink: true,
    fontSize: 15,
    fontFamily: 'JetBrains Mono, Consolas, Monaco, "Courier New", monospace',
    lineHeight: 1.2,
    theme: {
      background: isDarkMode.value ? '#121212' : '#1e1e1e',
      foreground: '#f0f0f0',
      cursor: '#ffffff',
      selection: isDarkMode.value ? '#353a46' : '#264f78',
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
  
  const fitAddon = new FitAddon()
  const webLinksAddon = new WebLinksAddon()
  
  terminal.loadAddon(fitAddon)
  terminal.loadAddon(webLinksAddon)
  
  // Open terminal in container
  terminal.open(container)
  
  // Fit terminal to container
  await nextTick()
  fitAddon.fit()
  
  // Store terminal instance in tab
  tabsStore.updateTabTerminal(tab.id, terminal, fitAddon)
  
  // Terminal event handlers will be set up separately for each tab
  
  // Restore buffer if exists
  if (tab.terminalBuffer) {
    terminal.write(tab.terminalBuffer)
  }
  
  return { terminal, fitAddon }
}

// Set up terminal event handlers for a specific tab
const setupTerminalEventHandlers = (tab) => {
  if (!tab.terminal) return
  
  // Clean up any existing handlers
  if (tab.terminalHandlers) {
    tab.terminalHandlers.forEach(cleanup => cleanup())
  }
  tab.terminalHandlers = []
  
  // Data handler
  const onDataHandler = (data) => {
    if (tab.isConnected && tab.id === tabsStore.activeTabId) {
      terminalStore.sendInput(data)
      // Update tab buffer
      tabsStore.appendToTabBuffer(tab.id, data)
    }
  }
  
  // Resize handler
  const onResizeHandler = (size) => {
    if (tab.isConnected && tab.id === tabsStore.activeTabId) {
      terminalStore.resizeTerminal(size)
    }
  }
  
  // Attach handlers
  tab.terminal.onData(onDataHandler)
  tab.terminal.onResize(onResizeHandler)
  
  // Store cleanup functions
  tab.terminalHandlers.push(
    () => tab.terminal?.dispose && tab.terminal.dispose()
  )
}

// Connect tab to SSH session
const connectTab = async (tab) => {
  if (tab.isConnected || tab.isConnecting) return
  
  try {
    console.log(`Connecting tab ${tab.id} to session ${tab.sessionId}`)
    tabsStore.updateTabConnection(tab.id, { isConnecting: true })
    
    // Initialize terminal store if not connected
    if (!terminalStore.socketConnected) {
      console.log('Initializing terminal store')
      await terminalStore.init()
    }
    
    // Initialize terminal if not already done
    if (!tab.terminal) {
      console.log('Initializing terminal for tab:', tab.id)
      await initializeTabTerminal(tab)
    }
    
    // Check for existing connections for this session
    console.log('Checking for existing connections')
    const existingConnections = await terminalStore.getUserConnections()
    const existingConnection = existingConnections.find(c => c.sessionId === tab.sessionId)
    
    if (existingConnection) {
      console.log('Found existing connection:', existingConnection.connectionId)
      // Attach to existing connection
      await terminalStore.attachToConnection(existingConnection.connectionId)
      tabsStore.updateTabConnection(tab.id, {
        connectionId: existingConnection.connectionId,
        isConnected: true,
        isConnecting: false
      })
    } else {
      console.log('Creating new connection for session:', tab.sessionId)
      // Create new connection
      await terminalStore.connectToSession(tab.sessionId, true)
      tabsStore.updateTabConnection(tab.id, {
        connectionId: terminalStore.connectionId,
        isConnected: true,
        isConnecting: false
      })
    }
    
    // Set up terminal listeners for this tab
    if (tab.terminal) {
      setupTerminalEventHandlers(tab)
    }
    
    // Focus terminal
    tab.terminal?.focus()
  } catch (error) {
    console.error('Failed to connect tab:', error)
    tabsStore.updateTabConnection(tab.id, {
      isConnected: false,
      isConnecting: false
    })
  }
}

// Switch to a different tab
const switchTab = async (tabId) => {
  tabsStore.setActiveTab(tabId)
  
  const tab = tabsStore.getTabById(tabId)
  if (!tab) return
  
  // Connect if not connected
  if (!tab.isConnected && !tab.isConnecting) {
    await connectTab(tab)
  }
  
  // Resize terminal to fit
  await nextTick()
  if (tab.fitAddon) {
    tab.fitAddon.fit()
  }
  
  // Focus terminal
  tab.terminal?.focus()
}

// Close a tab
const closeTab = async (tabId) => {
  const tab = tabsStore.getTabById(tabId)
  if (!tab) return
  
  // Disconnect if connected (but keep SSH connection alive on server)
  if (tab.isConnected) {
    await terminalStore.disconnectSession(false)
  }
  
  // Remove tab
  tabsStore.removeTab(tabId)
  
  // If no tabs left, go to home
  if (!tabsStore.hasActiveTabs) {
    router.push('/')
  }
}

// Open session in new tab
const openSessionInNewTab = async (session) => {
  showSessionSelector.value = false
  
  try {
    // Add new tab
    const tab = tabsStore.addTab(session)
    
    // Switch to the new tab and connect
    await switchTab(tab.id)
  } catch (error) {
    console.error('Failed to open session in new tab:', error)
  }
}

// Load available sessions
const loadAvailableSessions = async () => {
  await sessionStore.fetchSessions()
  availableSessions.value = sessionStore.allSessions
}

// Go home
const goHome = () => {
  // Disconnect all tabs (keep connections alive)
  tabsStore.allTabs.forEach(tab => {
    if (tab.isConnected) {
      terminalStore.disconnectSession(false)
    }
  })
  
  router.push('/')
}

// Context menu handling
const handleContextMenu = (event) => {
  const activeTab = tabsStore.activeTab
  if (!activeTab || !activeTab.terminal) return
  
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  selectedText.value = activeTab.terminal.getSelection()
  contextMenuVisible.value = true
  
  document.addEventListener('click', closeContextMenu)
}

const closeContextMenu = () => {
  contextMenuVisible.value = false
  document.removeEventListener('click', closeContextMenu)
}

const copySelectedText = () => {
  if (selectedText.value) {
    navigator.clipboard.writeText(selectedText.value)
  }
  closeContextMenu()
}

const pasteFromClipboard = () => {
  navigator.clipboard.readText()
    .then(text => {
      if (text && tabsStore.activeTab) {
        terminalStore.sendInput(text)
      }
    })
  closeContextMenu()
}

// Handle window resize
const handleResize = () => {
  tabsStore.allTabs.forEach(tab => {
    if (tab.fitAddon) {
      tab.fitAddon.fit()
    }
  })
}

// Handle keyboard shortcuts
const handleKeydown = (e) => {
  const activeTab = tabsStore.activeTab
  if (!activeTab || !activeTab.terminal) return
  
  // Ctrl+C or Command+C to copy
  if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.shiftKey) {
    const selection = activeTab.terminal.getSelection()
    if (selection) {
      navigator.clipboard.writeText(selection)
      e.preventDefault()
    }
  }
  
  // Ctrl+V or Command+V to paste
  if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
    navigator.clipboard.readText()
      .then(text => {
        if (text) {
          terminalStore.sendInput(text)
        }
      })
    e.preventDefault()
  }
  
  // Ctrl+T to open new tab
  if ((e.ctrlKey || e.metaKey) && e.key === 't') {
    if (tabsStore.canAddMoreTabs) {
      showSessionSelector.value = true
      e.preventDefault()
    }
  }
  
  // Ctrl+W to close current tab
  if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
    if (activeTab) {
      closeTab(activeTab.id)
      e.preventDefault()
    }
  }
  
  // Ctrl+Tab to switch to next tab
  if (e.ctrlKey && e.key === 'Tab') {
    const tabs = tabsStore.allTabs
    const currentIndex = tabs.findIndex(t => t.id === activeTab.id)
    const nextIndex = (currentIndex + 1) % tabs.length
    if (tabs[nextIndex]) {
      switchTab(tabs[nextIndex].id)
      e.preventDefault()
    }
  }
}

// Restore tabs on mount
onMounted(async () => {
  console.log('MultiTerminalView mounted')
  
  // Initialize terminal store
  if (!terminalStore.socketConnected) {
    console.log('Initializing terminal store on mount')
    await terminalStore.init()
  }
  
  // Check if we should open a specific session
  const sessionToOpen = localStorage.getItem('openSessionInTab')
  const sessionToRejoin = localStorage.getItem('rejoinSession')
  
  if (sessionToRejoin) {
    try {
      console.log('Rejoining active session from localStorage')
      const rejoinData = JSON.parse(sessionToRejoin)
      localStorage.removeItem('rejoinSession')
      // Create tab and attach to existing connection
      const tab = tabsStore.addTab(rejoinData.session)
      await initializeTabTerminal(tab)
      await terminalStore.attachToConnection(rejoinData.connectionId)
      tabsStore.updateTabConnection(tab.id, {
        connectionId: rejoinData.connectionId,
        isConnected: true,
        isConnecting: false
      })
      setupTerminalEventHandlers(tab)
    } catch (error) {
      console.error('Failed to rejoin session from localStorage:', error)
    }
  } else if (sessionToOpen) {
    try {
      console.log('Opening session from localStorage')
      const session = JSON.parse(sessionToOpen)
      localStorage.removeItem('openSessionInTab')
      // Open the session in a new tab
      await openSessionInNewTab(session)
    } catch (error) {
      console.error('Failed to open session from localStorage:', error)
    }
  } else {
    // Try to restore tabs from localStorage
    console.log('Attempting to restore tabs')
    const restored = tabsStore.restoreTabs()
    
    if (restored && tabsStore.hasActiveTabs) {
      console.log('Tabs restored, reconnecting to active tab')
      // Wait a bit for the UI to be ready
      await nextTick()
      
      // Reconnect to active tab
      const activeTab = tabsStore.activeTab
      if (activeTab) {
        console.log('Reconnecting to active tab:', activeTab.id)
        await switchTab(activeTab.id)
      }
    } else {
      console.log('No tabs to restore')
    }
  }
  
  // Load available sessions
  await loadAvailableSessions()
  
  // Set up event listeners
  window.addEventListener('resize', handleResize)
  document.addEventListener('keydown', handleKeydown)
})

// Clean up on unmount
onUnmounted(() => {
  console.log('MultiTerminalView unmounting')
  
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('click', closeContextMenu)
  
  // Clean up all terminal instances and their handlers
  tabsStore.allTabs.forEach(tab => {
    // Clean up terminal handlers
    if (tab.terminalHandlers) {
      tab.terminalHandlers.forEach(cleanup => {
        try {
          cleanup()
        } catch (e) {
          console.error('Error cleaning up terminal handler:', e)
        }
      })
    }
    
    if (tab.fitAddon) {
      try {
        tab.fitAddon.dispose()
      } catch (e) {
        console.error('Error disposing fitAddon:', e)
      }
    }
    
    if (tab.terminal) {
      try {
        tab.terminal.dispose()
      } catch (e) {
        console.error('Error disposing terminal:', e)
      }
    }
  })
  
  // Clean up terminal store listeners
  if (terminalStore.socket?.value?._terminalListeners) {
    terminalStore.socket.value._terminalListeners.forEach(cleanup => {
      try {
        cleanup()
      } catch (e) {
        console.error('Error cleaning up terminal store listener:', e)
      }
    })
  }
})

// Watch for dark mode changes
watch(() => isDarkMode.value, () => {
  // Reinitialize all terminals with new theme
  tabsStore.allTabs.forEach(async tab => {
    if (tab.terminal) {
      const buffer = tab.terminal.buffer.active.getLine(0)?.translateToString() || ''
      tabsStore.updateTabBuffer(tab.id, buffer)
      
      // Dispose old terminal
      tab.fitAddon?.dispose()
      tab.terminal?.dispose()
      
      // Create new terminal with updated theme
      await initializeTabTerminal(tab)
    }
  })
})
</script>

<style scoped>
.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.status-connected {
  background-color: #10b981;
  box-shadow: 0 0 4px #10b981;
}

.status-connecting {
  background-color: #f59e0b;
  box-shadow: 0 0 4px #f59e0b;
  animation: pulse 1.5s infinite;
}

.status-disconnected {
  background-color: #6b7280;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>