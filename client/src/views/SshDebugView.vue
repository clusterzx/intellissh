<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 transition-colors duration-200">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-8">
        <div class="flex justify-center items-center mb-4">
          <h1 class="text-3xl font-bold text-slate-900 dark:text-white">{{ $t('message.ssh_debug_tool') }}</h1>
          <DarkModeToggle class="ml-4" />
        </div>
        <p class="mt-2 text-lg text-slate-600 dark:text-slate-400">{{ $t('message.test_ssh_connections') }}</p>
      </div>

      <div class="bg-white dark:bg-slate-800 shadow-soft rounded-xl p-6 border border-slate-200 dark:border-slate-700 transition-colors duration-200">
        <form @submit.prevent="testConnection">
          <!-- Server Details -->
          <div class="mb-6">
            <h2 class="text-xl font-medium text-slate-900 dark:text-white mb-4">{{ $t('message.server_details') }}</h2>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label for="hostname" class="form-label">{{ $t('message.hostname_ip') }}</label>
                <input
                  id="hostname"
                  v-model="form.hostname"
                  type="text"
                  required
                  class="form-input"
                  :placeholder="$t('message.example_hostname_ip')"
                />
              </div>

              <div>
                <label for="port" class="form-label">{{ $t('message.port') }}</label>
                <input
                  id="port"
                  v-model.number="form.port"
                  type="number"
                  class="form-input"
                  placeholder="22"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
              <div>
                <label for="username" class="form-label">{{ $t('message.username_debug') }}</label>
                <input
                  id="username"
                  v-model="form.username"
                  type="text"
                  required
                  class="form-input"
                  :placeholder="$t('message.root_placeholder')"
                />
              </div>
            </div>
          </div>

          <!-- Private Key -->
          <div class="mb-6">
            <h2 class="text-xl font-medium text-slate-900 dark:text-white mb-4">{{ $t('message.private_key') }}</h2>
            <div>
              <label for="privateKey" class="form-label">{{ $t('message.private_key_content') }}</label>
              <textarea
                id="privateKey"
                v-model="form.privateKey"
                rows="10"
                required
                class="form-input font-mono text-sm"
                :placeholder="$t('message.private_key_placeholder')"
              ></textarea>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {{ $t('message.paste_private_key_content') }}
              </p>
            </div>

            <div class="mt-4">
              <label for="keyPassphrase" class="form-label">{{ $t('message.key_passphrase') }}</label>
              <input
                id="keyPassphrase"
                v-model="form.keyPassphrase"
                type="password"
                class="form-input"
                :placeholder="$t('message.enter_passphrase')"
              />
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {{ $t('message.passphrase_description') }}
              </p>
            </div>
          </div>

          <!-- Connection Test Button -->
          <div class="flex justify-center">
            <button
              type="submit"
              :disabled="isLoading"
              class="btn-primary py-2.5 px-6"
            >
              <span v-if="isLoading" class="spinner mr-2"></span>
              {{ isLoading ? $t('message.testing_connection') : $t('message.test_ssh_connection') }}
            </button>
          </div>
        </form>

        <!-- Results -->
        <div v-if="result" class="mt-8 animate-fade-in">
          <h2 class="text-xl font-medium text-slate-900 dark:text-white mb-4">{{ $t('message.test_results') }}</h2>
          
          <div v-if="result.success" class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-xl p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <div class="bg-green-100 dark:bg-green-800/30 p-1.5 rounded-full">
                  <svg class="h-5 w-5 text-green-500 dark:text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                </div>
              </div>
              <div class="ml-3">
                <h3 class="text-base font-medium text-green-800 dark:text-green-300">{{ $t('message.connection_successful') }}</h3>
                <div class="mt-2 text-sm text-green-700 dark:text-green-200">
                  <p>{{ result.message }}</p>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <div class="bg-red-100 dark:bg-red-800/30 p-1.5 rounded-full">
                  <svg class="h-5 w-5 text-red-500 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                  </svg>
                </div>
              </div>
              <div class="ml-3">
                <h3 class="text-base font-medium text-red-800 dark:text-red-300">{{ $t('message.connection_failed_debug') }}</h3>
                <div class="mt-2 text-sm text-red-700 dark:text-red-200">
                  <p>{{ result.message }}</p>
                  <div v-if="result.details" class="mt-2 p-3 bg-red-100 dark:bg-red-900/40 rounded-lg overflow-auto max-h-48 custom-scrollbar">
                    <pre class="text-xs whitespace-pre-wrap font-mono text-red-800 dark:text-red-200">{{ result.details }}</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="mt-6 text-center">
        <router-link to="/" class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors">
          &larr; {{ $t('message.back_to_sessions') }}
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import DarkModeToggle from '@/components/DarkModeToggle.vue'
import { useI18n } from 'vue-i18n'

// Form state
const form = ref({
  hostname: '',
  port: 22,
  username: '',
  privateKey: '',
  keyPassphrase: ''
})

const isLoading = ref(false)
const result = ref(null)
const { t } = useI18n()

// Test SSH connection
async function testConnection() {
  isLoading.value = true
  result.value = null
  
  try {
    const response = await axios.post('/api/ssh/debug-test', {
      hostname: form.value.hostname,
      port: form.value.port || 22,
      username: form.value.username,
      privateKey: form.value.privateKey,
      keyPassphrase: form.value.keyPassphrase || ''
    })
    
    result.value = {
      success: true,
      message: response.data.message || t('message.connection_successful')
    }
  } catch (error) {
    let errorMessage = t('message.connection_failed_debug')
    let errorDetails = null
    
    if (error.response) {
      errorMessage = error.response.data.message || 'Connection failed'
      errorDetails = error.response.data.details
    } else if (error.message) {
      errorMessage = error.message
    }
    
    result.value = {
      success: false,
      message: errorMessage,
      details: errorDetails
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(239, 68, 68, 0.5) rgba(254, 226, 226, 0.5);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background-color: #fee2e2; /* Tailwind bg-red-100 */
  border-radius: 0.5rem;     /* Tailwind rounded */
}
.dark .custom-scrollbar::-webkit-scrollbar-track {
  background-color: rgba(127, 29, 29, 0.2); /* Tailwind dark:bg-red-900/20 */
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #f87171; /* Tailwind bg-red-400 */
  border-radius: 0.5rem;     /* Tailwind rounded */
  transition: background-color 0.2s;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #ef4444; /* Tailwind hover:bg-red-500 */
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #b91c1c; /* Tailwind dark:bg-red-700 */
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #dc2626; /* Tailwind dark:hover:bg-red-600 */
}

.dark .custom-scrollbar {
  scrollbar-color: rgba(239, 68, 68, 0.7) rgba(127, 29, 29, 0.5);
}
</style>
