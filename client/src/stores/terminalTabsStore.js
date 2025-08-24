import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useTerminalTabsStore = defineStore('terminalTabs', () => {
  // State
  const tabs = ref([])
  const activeTabId = ref(null)
  const maxTabs = ref(10) // Maximum number of tabs allowed
  
  // Persist tabs in localStorage for session restoration
  const persistTabs = () => {
    const tabsData = tabs.value.map(tab => ({
      id: tab.id,
      sessionId: tab.sessionId,
      sessionName: tab.sessionName,
      hostname: tab.hostname,
      username: tab.username,
      connectionId: tab.connectionId,
      isConnected: tab.isConnected,
      terminalBuffer: tab.terminalBuffer
    }))
    localStorage.setItem('terminalTabs', JSON.stringify(tabsData))
    localStorage.setItem('activeTabId', activeTabId.value || '')
  }
  
  // Restore tabs from localStorage
  const restoreTabs = () => {
    const savedTabs = localStorage.getItem('terminalTabs')
    const savedActiveTab = localStorage.getItem('activeTabId')
    
    if (savedTabs) {
      try {
        const parsedTabs = JSON.parse(savedTabs)
        console.log('Restoring tabs from localStorage:', parsedTabs)
        
        tabs.value = parsedTabs.map(tab => ({
          ...tab,
          terminal: null, // Terminal instances will be recreated
          fitAddon: null,
          terminalHandlers: null,
          isConnected: false, // Will reconnect after restoration
          isConnecting: false
        }))
        
        if (savedActiveTab && tabs.value.find(t => t.id === savedActiveTab)) {
          activeTabId.value = savedActiveTab
          console.log('Restored active tab:', savedActiveTab)
        } else if (tabs.value.length > 0) {
          activeTabId.value = tabs.value[0].id
          console.log('Set first tab as active:', tabs.value[0].id)
        }
        
        return true
      } catch (error) {
        console.error('Failed to restore tabs:', error)
        localStorage.removeItem('terminalTabs')
        localStorage.removeItem('activeTabId')
        return false
      }
    }
    return false
  }
  
  // Getters
  const allTabs = computed(() => tabs.value)
  const activeTab = computed(() => tabs.value.find(t => t.id === activeTabId.value))
  const tabCount = computed(() => tabs.value.length)
  const canAddMoreTabs = computed(() => tabs.value.length < maxTabs.value)
  const hasActiveTabs = computed(() => tabs.value.length > 0)
  
  // Get tab by ID
  const getTabById = (tabId) => {
    return tabs.value.find(t => t.id === tabId)
  }
  
  // Get tab by session ID
  const getTabBySessionId = (sessionId) => {
    return tabs.value.find(t => t.sessionId === sessionId)
  }
  
  // Add a new tab
  const addTab = (sessionData) => {
    // Check if we already have a tab for this session
    const existingTab = getTabBySessionId(sessionData.id)
    if (existingTab) {
      // Switch to existing tab instead of creating a new one
      setActiveTab(existingTab.id)
      return existingTab
    }
    
    // Check max tabs limit
    if (!canAddMoreTabs.value) {
      throw new Error(`Maximum number of tabs (${maxTabs.value}) reached`)
    }
    
    const tabId = `tab_${Date.now()}_${sessionData.id}`
    const newTab = {
      id: tabId,
      sessionId: sessionData.id,
      sessionName: sessionData.name,
      hostname: sessionData.hostname,
      username: sessionData.username,
      port: sessionData.port,
      connectionId: null,
      terminal: null,
      fitAddon: null,
      isConnected: false,
      isConnecting: false,
      terminalBuffer: '',
      lastActivity: Date.now()
    }
    
    tabs.value.push(newTab)
    activeTabId.value = tabId
    persistTabs()
    
    return newTab
  }
  
  // Remove a tab
  const removeTab = (tabId) => {
    const tabIndex = tabs.value.findIndex(t => t.id === tabId)
    if (tabIndex === -1) return false
    
    const tab = tabs.value[tabIndex]
    
    // Clean up terminal resources
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
    
    // Remove the tab
    tabs.value.splice(tabIndex, 1)
    
    // Update active tab if necessary
    if (activeTabId.value === tabId) {
      if (tabs.value.length > 0) {
        // Switch to the next tab or previous if it was the last one
        const newIndex = Math.min(tabIndex, tabs.value.length - 1)
        activeTabId.value = tabs.value[newIndex].id
      } else {
        activeTabId.value = null
      }
    }
    
    persistTabs()
    return true
  }
  
  // Set active tab
  const setActiveTab = (tabId) => {
    const tab = getTabById(tabId)
    if (tab) {
      activeTabId.value = tabId
      tab.lastActivity = Date.now()
      persistTabs()
      return true
    }
    return false
  }
  
  // Update tab connection status
  const updateTabConnection = (tabId, connectionData) => {
    const tab = getTabById(tabId)
    if (tab) {
      tab.connectionId = connectionData.connectionId || tab.connectionId
      tab.isConnected = connectionData.isConnected !== undefined ? connectionData.isConnected : tab.isConnected
      tab.isConnecting = connectionData.isConnecting !== undefined ? connectionData.isConnecting : tab.isConnecting
      tab.lastActivity = Date.now()
      persistTabs()
      return true
    }
    return false
  }
  
  // Update tab terminal instance
  const updateTabTerminal = (tabId, terminal, fitAddon) => {
    const tab = getTabById(tabId)
    if (tab) {
      tab.terminal = terminal
      tab.fitAddon = fitAddon
      return true
    }
    return false
  }
  
  // Update terminal buffer for a tab
  const updateTabBuffer = (tabId, buffer) => {
    const tab = getTabById(tabId)
    if (tab) {
      tab.terminalBuffer = buffer
      persistTabs()
      return true
    }
    return false
  }
  
  // Append to terminal buffer
  const appendToTabBuffer = (tabId, data) => {
    const tab = getTabById(tabId)
    if (tab) {
      tab.terminalBuffer += data
      // Keep buffer size reasonable (last 100KB)
      if (tab.terminalBuffer.length > 100000) {
        tab.terminalBuffer = tab.terminalBuffer.substring(tab.terminalBuffer.length - 100000)
      }
      persistTabs()
      return true
    }
    return false
  }
  
  // Clear all tabs
  const clearAllTabs = () => {
    // Clean up all terminal resources
    tabs.value.forEach(tab => {
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
    
    tabs.value = []
    activeTabId.value = null
    localStorage.removeItem('terminalTabs')
    localStorage.removeItem('activeTabId')
  }
  
  // Close disconnected tabs
  const closeDisconnectedTabs = () => {
    const disconnectedTabs = tabs.value.filter(t => !t.isConnected && !t.isConnecting)
    disconnectedTabs.forEach(tab => removeTab(tab.id))
  }
  
  // Get tabs for a specific session
  const getTabsForSession = (sessionId) => {
    return tabs.value.filter(t => t.sessionId === sessionId)
  }
  
  // Move tab position
  const moveTab = (tabId, newIndex) => {
    const currentIndex = tabs.value.findIndex(t => t.id === tabId)
    if (currentIndex === -1 || newIndex < 0 || newIndex >= tabs.value.length) {
      return false
    }
    
    const [tab] = tabs.value.splice(currentIndex, 1)
    tabs.value.splice(newIndex, 0, tab)
    persistTabs()
    return true
  }
  
  return {
    // State
    tabs,
    activeTabId,
    maxTabs,
    
    // Getters
    allTabs,
    activeTab,
    tabCount,
    canAddMoreTabs,
    hasActiveTabs,
    
    // Actions
    getTabById,
    getTabBySessionId,
    addTab,
    removeTab,
    setActiveTab,
    updateTabConnection,
    updateTabTerminal,
    updateTabBuffer,
    appendToTabBuffer,
    clearAllTabs,
    closeDisconnectedTabs,
    getTabsForSession,
    moveTab,
    restoreTabs,
    persistTabs
  }
})