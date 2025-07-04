<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="px-4 py-6 sm:px-0">
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div class="flex items-center">
            <h1 class="text-3xl font-bold text-slate-900 dark:text-white">SSH Sessions</h1>
          </div>
          <div class="flex space-x-3">
            <router-link
              to="/debug"
              class="btn-outline flex items-center"
              title="SSH Debug Tool"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Debug Tool
            </router-link>
            <button
              @click="showCreateModal = true"
              class="btn-primary"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Session
            </button>
          </div>
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="px-4 mb-6 sm:px-0">
        <div class="max-w-lg">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Search sessions..."
              class="form-input pl-10"
            />
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="sessionStore.isLoading" class="px-4 sm:px-0">
        <div class="text-center py-12 bg-white dark:bg-slate-800 rounded-xl shadow-soft p-8 animate-fade-in">
          <div class="spinner mx-auto mb-4 h-10 w-10 border-4"></div>
          <p class="text-slate-600 dark:text-slate-300 text-lg">Loading sessions...</p>
          
          <div class="mt-8">
            <p class="text-sm text-slate-500 dark:text-slate-400 mb-3">If loading takes too long, click the button below</p>
            <button 
              @click="forceRefreshSessions" 
              class="btn-primary"
            >
              Manual Refresh
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredSessions.length === 0 && !searchQuery" class="px-4 sm:px-0">
        <div class="text-center py-12 bg-white dark:bg-slate-800 rounded-xl shadow-soft p-8 animate-fade-in">
          <div class="bg-indigo-100 dark:bg-indigo-900/30 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <svg class="h-12 w-12 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          </div>
          <h3 class="mt-2 text-xl font-medium text-slate-900 dark:text-white">No sessions</h3>
          <p class="mt-2 text-slate-500 dark:text-slate-400">Get started by creating a new SSH session.</p>
          <div class="mt-8">
            <button
              @click="showCreateModal = true"
              class="btn-primary"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Session
            </button>
          </div>
        </div>
      </div>

      <!-- No Search Results -->
      <div v-else-if="filteredSessions.length === 0 && searchQuery" class="px-4 sm:px-0">
        <div class="text-center py-12 bg-white dark:bg-slate-800 rounded-xl shadow-soft p-8 animate-fade-in">
          <div class="bg-amber-100 dark:bg-amber-900/30 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <svg class="h-12 w-12 text-amber-500 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 class="mt-2 text-xl font-medium text-slate-900 dark:text-white">No results found</h3>
          <p class="text-slate-500 dark:text-slate-400">No sessions found matching "{{ searchQuery }}"</p>
        </div>
      </div>

      <!-- Sessions Grid -->
      <div v-else class="px-4 sm:px-0">
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="session in filteredSessions"
            :key="session.id"
            class="card hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
          >
            <div class="card-header">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <h3 class="text-lg font-medium text-slate-900 dark:text-white truncate">
                    {{ session.name }}
                  </h3>
                  <!-- Connection Status -->
                  <div
                    v-if="isSessionConnected(session.id)"
                    class="status-indicator status-connected ml-2"
                    title="Connected"
                  ></div>
                </div>
                <!-- Dropdown Menu -->
                <div class="relative">
                  <button
                    @click="toggleDropdown(session.id, $event)"
                    class="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    data-dropdown-toggle
                  >
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                  <div
                    v-if="dropdownOpen === session.id"
                    class="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg z-10 border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in"
                  >
                    <div class="py-1">
                      <button
                        @click="editSession(session)"
                        class="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        @click="duplicateSession(session)"
                        class="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                          <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
                        </svg>
                        Duplicate
                      </button>
                      <hr class="my-1 border-slate-200 dark:border-slate-700" />
                      <button
                        @click="deleteSession(session)"
                        class="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                <div class="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                  </svg>
                  <span>{{ session.username }}@{{ session.hostname }}:{{ session.port }}</span>
                </div>
                <div class="flex items-center mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
                  </svg>
                  <span>Updated {{ formatDate(session.updated_at) }}</span>
                </div>
              </div>
              
              <!-- Console Snapshot Preview -->
              <div v-if="session.console_snapshot || session.consoleSnapshot" class="mt-4">
                <div class="relative rounded-lg overflow-hidden group">
                  <img 
                    :src="session.console_snapshot || session.consoleSnapshot" 
                    alt="Console Snapshot" 
                    class="w-full h-36 object-cover rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer transition-transform duration-300 group-hover:scale-105"
                    @click="openFullScreenSnapshot(session.console_snapshot || session.consoleSnapshot)"
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-40 rounded-lg"></div>
                  <div class="absolute bottom-2 left-2 text-xs text-white font-mono bg-slate-800/80 backdrop-blur-sm px-2.5 py-1 rounded-full">
                    Last Session
                  </div>
                </div>
              </div>
            </div>
            <div class="card-footer">
              <button
                @click="connectToSession(session)"
                :disabled="connectingToSession === session.id"
                class="w-full btn-primary"
              >
                <span v-if="connectingToSession === session.id" class="spinner mr-2"></span>
                {{ connectingToSession === session.id ? 'Connecting...' : 'Connect' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Session Form Modal -->
    <SessionForm
      v-if="showCreateModal || editingSession"
      :session="editingSession"
      @close="closeModal"
      @saved="handleSessionSaved"
    />

    <!-- Delete Confirmation Modal -->
    <div
      v-if="sessionToDelete"
      class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <div class="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-lg animate-fade-in">
        <div class="bg-red-100 dark:bg-red-900/20 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-slate-900 dark:text-white mb-4 text-center">Delete Session</h3>
        <p class="text-sm text-slate-600 dark:text-slate-400 mb-6 text-center">
          Are you sure you want to delete "{{ sessionToDelete.name }}"? This action cannot be undone.
        </p>
        <div class="flex justify-center space-x-3">
          <button
            @click="sessionToDelete = null"
            class="btn-outline"
          >
            Cancel
          </button>
          <button
            @click="confirmDelete"
            :disabled="deletingSession"
            class="btn-danger"
          >
            <span v-if="deletingSession" class="spinner mr-2"></span>
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Full Screen Snapshot Modal -->
    <div
      v-if="fullScreenSnapshot"
      class="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      @click="fullScreenSnapshot = null"
    >
      <div class="relative max-w-4xl max-h-screen animate-fade-in">
        <button 
          @click="fullScreenSnapshot = null"
          class="absolute top-4 right-4 text-white bg-slate-800/80 rounded-full p-2 hover:bg-slate-700/80 transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <img 
          :src="fullScreenSnapshot" 
          alt="Console Snapshot" 
          class="max-w-full max-h-[90vh] object-contain rounded-lg shadow-lg"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/sessionStore'
import { useTerminalStore } from '@/stores/terminalStore'
import SessionForm from '@/components/SessionForm.vue'
import DarkModeToggle from '@/components/DarkModeToggle.vue'

// Stores and router
const sessionStore = useSessionStore()
const terminalStore = useTerminalStore()
const router = useRouter()

// State
const searchQuery = ref('')
const showCreateModal = ref(false)
const editingSession = ref(null)
const sessionToDelete = ref(null)
const dropdownOpen = ref(null)
const connectingToSession = ref(null)
const testingConnection = ref(null)
const deletingSession = ref(false)
const fullScreenSnapshot = ref(null)

// Computed
const filteredSessions = computed(() => {
  if (!searchQuery.value) return sessionStore.allSessions
  return sessionStore.searchSessions(searchQuery.value)
})

// Methods
const toggleDropdown = (sessionId, event) => {
  event.stopPropagation()
  dropdownOpen.value = dropdownOpen.value === sessionId ? null : sessionId
}

const closeDropdown = () => {
  dropdownOpen.value = null
}

const editSession = (session) => {
  editingSession.value = session
  closeDropdown()
}

const duplicateSession = async (session) => {
  closeDropdown()
  const newName = `${session.name} (Copy)`
  const result = await sessionStore.duplicateSession(session.id, newName)
  
  if (!result.success) {
    console.error('Failed to duplicate session:', result.error)
  }
}

const testConnection = async (session) => {
  closeDropdown()
  testingConnection.value = session.id
  
  const result = await sessionStore.testConnection(session.id)
  
  if (result.success) {
    // Show success message (you could implement a toast notification here)
    console.log('Connection test successful')
  } else {
    console.error('Connection test failed:', result.error)
  }
  
  testingConnection.value = null
}

const deleteSession = (session) => {
  sessionToDelete.value = session
  closeDropdown()
}

const confirmDelete = async () => {
  if (!sessionToDelete.value) return
  
  deletingSession.value = true
  const result = await sessionStore.deleteSession(sessionToDelete.value.id)
  
  if (result.success) {
    sessionToDelete.value = null
  } else {
    console.error('Failed to delete session:', result.error)
  }
  
  deletingSession.value = false
}

const connectToSession = async (session) => {
  connectingToSession.value = session.id
  
  try {
    // Navigate to terminal view
    router.push(`/terminal/${session.id}`)
  } catch (error) {
    console.error('Failed to connect to session:', error)
    connectingToSession.value = null
  }
}

const isSessionConnected = (sessionId) => {
  return terminalStore.hasActiveSession && 
         terminalStore.activeSession?.id === sessionId
}

const closeModal = () => {
  showCreateModal.value = false
  editingSession.value = null
}

const handleSessionSaved = () => {
  closeModal()
  // Refresh sessions list
  sessionStore.fetchSessions()
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 1) {
    return 'yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else {
    return date.toLocaleDateString()
  }
}

// Click outside handler reference
const handleClickOutside = (event) => {
  // Don't close if clicking on the dropdown toggle button
  if (event.target.closest('[data-dropdown-toggle]')) {
    return
  }
  closeDropdown()
}

// Lifecycle
onMounted(async () => {
  console.log('HomeView mounted, initializing')
  
  // First, ensure we're not in a loading state
  sessionStore.clearLoadingState()
  
  // Initialize sessions with an empty array if they're null
  if (!sessionStore.sessions.value) {
    sessionStore.sessions.value = []
  }
  
  // Try to fetch sessions
  refreshSessions()
  
  // Add click outside handler for dropdown
  document.addEventListener('click', handleClickOutside)
  
  // Add navigation event listener to refresh sessions when navigating back to this page
  window.addEventListener('popstate', handleNavigateBack)
  router.beforeResolve((to, from, next) => {
    if (to.path === '/') {
      refreshSessions()
    }
    next()
  })
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('popstate', handleNavigateBack)
})

// Handler for navigation events
const handleNavigateBack = () => {
  if (window.location.pathname === '/') {
    refreshSessions()
  }
}

// Helper function to refresh sessions with proper error handling
const refreshSessions = async () => {
  try {
    // Set a safety timeout to ensure loading state is cleared
    const safetyTimeout = setTimeout(() => {
      if (sessionStore.isLoading) {
        console.warn('Fetch sessions timeout - forcing loading state clear')
        sessionStore.clearLoadingState()
      }
    }, 3000)
    
    // Fetch the sessions
    await sessionStore.fetchSessions()
    
    // Clear the timeout if successful
    clearTimeout(safetyTimeout)
  } catch (err) {
    console.error('Failed to refresh sessions:', err)
    // Ensure loading state is reset even on error
    sessionStore.clearLoadingState()
  }
}

// Open full screen snapshot
const openFullScreenSnapshot = (snapshotUrl) => {
  fullScreenSnapshot.value = snapshotUrl
}

// Force refresh function for the manual refresh button
const forceRefreshSessions = async () => {
  console.log('Manual refresh triggered')
  
  // First clear any loading state and reset sessions
  sessionStore.clearLoadingState()
  
  // Directly fetch from API bypassing any caches
  try {
    const response = await fetch('/api/sessions', {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      credentials: 'same-origin'
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Manually update the store
    sessionStore.sessions.value = data.sessions
    console.log('Manual refresh successful:', data.sessions.length, 'sessions loaded')
  } catch (err) {
    console.error('Manual refresh failed:', err)
    // Make sure we have an empty array at minimum
    sessionStore.sessions.value = []
  }
}
</script>
