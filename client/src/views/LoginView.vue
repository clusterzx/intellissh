<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
    <div class="max-w-md w-full space-y-8">
      <div>
        <div class="mx-auto h-14 w-14 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
          <svg class="h-9 w-9 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        </div>
        <h2 class="mt-6 text-center text-3xl font-bold text-slate-900 dark:text-white">
          IntelliSSH
        </h2>
        <div class="mt-3 flex justify-center items-center gap-2">
          <p class="text-center text-sm text-slate-600 dark:text-slate-400">
            {{ isRegistering ? 'Create your account' : 'Sign in to your account' }}
          </p>
          <DarkModeToggle />
        </div>
      </div>
      
      <div class="bg-white dark:bg-slate-800 shadow-soft rounded-xl p-6 sm:p-8 animate-fade-in">
        <form class="space-y-6" @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <div>
              <label for="username" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Username</label>
              <input
                id="username"
                v-model="form.username"
                name="username"
                type="text"
                required
                class="form-input w-full"
                :class="{ 'border-red-300 dark:border-red-500': errors.username }"
                placeholder="Enter your username"
              />
            </div>
            <div>
              <label for="password" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
              <input
                id="password"
                v-model="form.password"
                name="password"
                type="password"
                required
                class="form-input w-full"
                :class="{ 'border-red-300 dark:border-red-500': errors.password }"
                placeholder="Enter your password"
              />
            </div>
            <div v-if="isRegistering">
              <label for="confirmPassword" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirm Password</label>
              <input
                id="confirmPassword"
                v-model="form.confirmPassword"
                name="confirmPassword"
                type="password"
                required
                class="form-input w-full"
                :class="{ 'border-red-300 dark:border-red-500': errors.confirmPassword }"
                placeholder="Confirm your password"
              />
            </div>
            <div v-if="requires2fa">
              <label for="totpCode" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">2FA Code</label>
              <input
                id="totpCode"
                v-model="totpCode"
                name="totpCode"
                type="text"
                required
                class="form-input w-full"
                placeholder="Enter your 2FA code"
              />
            </div>
          </div>

          <!-- Error Messages -->
          <div v-if="hasErrors" class="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400 dark:text-red-300" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800 dark:text-red-300">
                  {{ allErrors.length > 1 ? 'Please fix the following errors:' : 'Error:' }}
                </h3>
                <div class="mt-2 text-sm text-red-700 dark:text-red-200">
                  <ul class="list-disc pl-5 space-y-1">
                    <li v-for="error in allErrors" :key="error">{{ error }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              :disabled="loading"
              class="btn-primary w-full py-2.5 justify-center"
            >
              <span v-if="loading" class="spinner mr-2"></span>
              {{ requires2fa ? 'Verify & Sign in' : (isRegistering ? 'Create Account' : 'Sign in') }}
            </button>
          </div>

          <div class="text-center space-y-2">
            <button
              type="button"
              @click="toggleMode"
              class="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
            >
              {{ isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Sign up" }}
            </button>
            <div v-if="!isRegistering">
              <router-link 
                to="/forgot-password" 
                class="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
              >
                Forgot your password?
              </router-link>
            </div>
          </div>
        </form>
      </div>
      
      <!-- Security Note -->
      <div class="text-center text-xs text-slate-500 dark:text-slate-500 mt-8">
        <p>Secure connection • All data is encrypted</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import DarkModeToggle from '@/components/DarkModeToggle.vue'

// Stores and router
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

// State
const isRegistering = ref(false)
const loading = ref(false)
const totpCode = ref('')
const form = ref({
  username: '',
  password: '',
  confirmPassword: ''
})
const errors = ref({})

// Computed
const requires2fa = computed(() => authStore.getRequires2fa)
const hasErrors = computed(() => Object.keys(errors.value).length > 0 || authStore.authError)
const allErrors = computed(() => {
  const errorList = Object.values(errors.value).flat()
  if (authStore.authError) {
    errorList.push(authStore.authError)
  }
  return errorList
})

// Methods
const validateForm = () => {
  errors.value = {}
  
  if (!form.value.username.trim()) {
    errors.value.username = 'Username is required'
  } else if (form.value.username.length < 3) {
    errors.value.username = 'Username must be at least 3 characters'
  }
  
  if (!form.value.password) {
    errors.value.password = 'Password is required'
  } else if (form.value.password.length < 6) {
    errors.value.password = 'Password must be at least 6 characters'
  }
  
  if (isRegistering.value) {
    if (!form.value.confirmPassword) {
      errors.value.confirmPassword = 'Please confirm your password'
    } else if (form.value.password !== form.value.confirmPassword) {
      errors.value.confirmPassword = 'Passwords do not match'
    }
  }
  
  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }
  
  loading.value = true
  authStore.clearError()
  
  try {
    if (isRegistering.value) {
      const result = await authStore.register({
        username: form.value.username.trim(),
        password: form.value.password
      })
      
      if (result.success) {
        // Auto-login after successful registration
        await authStore.login({
          username: form.value.username.trim(),
          password: form.value.password
        })
        
        // Redirect to intended page or home
        const redirect = route.query.redirect || '/'
        router.push(redirect)
      }
    } else if (requires2fa.value) {
      // Handle 2FA login
      const result = await authStore.loginWith2fa(
        authStore.getTempUserFor2fa.id,
        totpCode.value
      )
      if (result.success) {
        const redirect = route.query.redirect || '/'
        router.push(redirect)
      }
    } else {
      const result = await authStore.login({
        username: form.value.username.trim(),
        password: form.value.password
      })
      
      if (result.success) {
        // Redirect to intended page or home
        const redirect = route.query.redirect || '/'
        router.push(redirect)
      }
    }
  } catch (error) {
    console.error('Authentication error:', error)
  } finally {
    loading.value = false
    totpCode.value = '' // Clear 2FA code after attempt
  }
}

const toggleMode = () => {
  isRegistering.value = !isRegistering.value
  errors.value = {}
  authStore.clearError()
  authStore.requires2fa = false // Clear 2FA state
  authStore.tempUserFor2fa = null // Clear temp user
  form.value.confirmPassword = ''
}

// Lifecycle
onMounted(() => {
  // Clear any existing errors
  authStore.clearError()
  
  // If user is already authenticated, redirect
  if (authStore.isAuthenticated) {
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  }
})
</script>
