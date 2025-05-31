<template>
  <div id="app" class="min-h-screen">
    <!-- Navigation Bar -->
    <nav v-if="isAuthenticated" class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm transition-colors duration-200 z-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <!-- Logo and Navigation -->
          <div class="flex items-center">
            <router-link to="/" class="flex items-center space-x-2">
              <div class="flex-shrink-0 text-indigo-600 dark:text-indigo-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd" />
                </svg>
              </div>
              <h1 class="text-xl font-bold text-slate-900 dark:text-white">IntelliSSH</h1>
            </router-link>
            
            <div class="hidden sm:ml-8 sm:flex sm:space-x-8">
              <router-link
                to="/"
                class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors"
                :class="$route.name === 'home' 
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' 
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'"
              >
                Sessions
              </router-link>
              <router-link
                to="/settings"
                class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors"
                :class="$route.name === 'settings' 
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' 
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'"
              >
                Settings
              </router-link>
              <router-link
                to="/profile"
                class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors"
                :class="$route.name === 'profile' 
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' 
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'"
              >
                Profile
              </router-link>
            </div>
          </div>

          <!-- User Menu and Actions -->
          <div class="flex items-center space-x-5">
            <!-- Connection Status -->
            <div v-if="terminalStore.socketConnected" class="hidden sm:flex items-center text-sm text-slate-500 dark:text-slate-400">
              <div class="status-indicator status-connected mr-2"></div>
              Connected
            </div>
            <div v-else-if="terminalStore.connecting" class="hidden sm:flex items-center text-sm text-slate-500 dark:text-slate-400">
              <div class="status-indicator status-connecting mr-2"></div>
              Connecting...
            </div>
            <div v-else class="hidden sm:flex items-center text-sm text-slate-500 dark:text-slate-400">
              <div class="status-indicator status-disconnected mr-2"></div>
              Disconnected
            </div>

            <!-- Dark Mode Toggle -->
            <DarkModeToggle />

            <!-- User Info -->
            <div class="flex items-center space-x-4">
              <span class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ authStore.currentUser?.username }}</span>
              <button
                @click="handleLogout"
                class="btn-ghost px-3 py-1.5 text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="flex-1">
      <router-view />
    </main>

    <!-- Global Loading Overlay -->
    <div v-if="showGlobalLoading" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center transition-all duration-200">
      <div class="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full mx-4 shadow-soft animate-fade-in">
        <div class="flex items-center">
          <div class="spinner mr-3"></div>
          <div class="text-sm text-slate-600 dark:text-slate-300">{{ loadingMessage }}</div>
        </div>
      </div>
    </div>

    <!-- Global Error Toast -->
    <div
      v-if="globalError"
      class="fixed top-4 right-4 bg-red-500 dark:bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-md animate-fade-in"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd"
            />
          </svg>
          <span class="text-sm">{{ globalError }}</span>
        </div>
        <button @click="clearGlobalError" class="ml-4 text-white hover:text-gray-200 transition-colors">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useTerminalStore } from '@/stores/terminalStore'
import DarkModeToggle from '@/components/DarkModeToggle.vue'

// Stores
const authStore = useAuthStore()
const terminalStore = useTerminalStore()
const router = useRouter()

// State
const showGlobalLoading = ref(false)
const loadingMessage = ref('')
const globalError = ref('')

// Computed
const isAuthenticated = computed(() => authStore.isAuthenticated)

// Methods
const handleLogout = async () => {
  showGlobalLoading.value = true
  loadingMessage.value = 'Logging out...'
  
  try {
    // Disconnect terminal
    terminalStore.disconnect()
    
    // Logout user
    await authStore.logout()
    
    // Redirect to login
    router.push('/login')
  } catch (error) {
    globalError.value = 'Logout failed'
  } finally {
    showGlobalLoading.value = false
  }
}

const clearGlobalError = () => {
  globalError.value = ''
}

const initializeApp = async () => {
  // Initialize auth store
  await authStore.init()
  
  // If authenticated, initialize terminal connection
  if (authStore.isAuthenticated) {
    try {
      await terminalStore.init()
    } catch (error) {
      console.error('Failed to initialize terminal connection:', error)
      // Don't show error immediately, let user try to connect manually
    }
  }
}

// Watch for auth errors
watch(() => authStore.authError, (error) => {
  if (error) {
    globalError.value = error
  }
})

// Watch for terminal errors
watch(() => terminalStore.error, (error) => {
  if (error) {
    globalError.value = error
  }
})

// Auto-clear errors after 5 seconds
watch(() => globalError.value, (error) => {
  if (error) {
    setTimeout(() => {
      if (globalError.value === error) {
        globalError.value = ''
      }
    }, 5000)
  }
})

// Lifecycle
onMounted(() => {
  initializeApp()
  
  // Set up periodic token refresh (every 20 minutes)
  const refreshInterval = setInterval(async () => {
    if (authStore.isAuthenticated) {
      await authStore.refreshToken()
    }
  }, 20 * 60 * 1000)
  
  // Clean up on unmount
  onUnmounted(() => {
    clearInterval(refreshInterval)
    terminalStore.disconnect()
  })
})

// Handle browser tab visibility change
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && authStore.isAuthenticated) {
    // When tab becomes visible, verify token is still valid
    authStore.verifyToken()
  }
})

// Handle browser beforeunload
window.addEventListener('beforeunload', () => {
  terminalStore.disconnect()
})
</script>
