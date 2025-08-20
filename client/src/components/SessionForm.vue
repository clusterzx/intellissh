<template>
  <div class="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center transition-all duration-200">
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full mx-4 max-h-screen overflow-y-auto animate-fade-in">
      <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <h3 class="text-xl font-medium text-slate-900 dark:text-white">
          {{ isEditing ? 'Edit Session' : 'New Session' }}
        </h3>
      </div>

      <form @submit.prevent="handleSubmit" class="px-6 py-5 space-y-5">
        <!-- Session Name -->
        <div>
          <label for="name" class="form-label">Session Name</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            required
            class="form-input"
            :class="{ 'border-red-300 dark:border-red-500': errors.name }"
            placeholder="My Server"
          />
          <p v-if="errors.name" class="form-error">{{ errors.name }}</p>
        </div>

        <!-- Hostname -->
        <div>
          <label for="hostname" class="form-label">Hostname/IP</label>
          <input
            id="hostname"
            v-model="form.hostname"
            type="text"
            required
            class="form-input"
            :class="{ 'border-red-300 dark:border-red-500': errors.hostname }"
            placeholder="192.168.1.100 or server.example.com"
          />
          <p v-if="errors.hostname" class="form-error">{{ errors.hostname }}</p>
        </div>

        <!-- Port and Username -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="port" class="form-label">Port</label>
            <input
              id="port"
              v-model.number="form.port"
              type="number"
              min="1"
              max="65535"
              class="form-input"
              :class="{ 'border-red-300 dark:border-red-500': errors.port }"
              placeholder="22"
            />
            <p v-if="errors.port" class="form-error">{{ errors.port }}</p>
          </div>
          
          <div>
            <label for="username" class="form-label">Username</label>
            <input
              id="username"
              v-model="form.username"
              type="text"
              required
              class="form-input"
              :class="{ 'border-red-300 dark:border-red-500': errors.username }"
              placeholder="root"
            />
            <p v-if="errors.username" class="form-error">{{ errors.username }}</p>
          </div>
        </div>

        <!-- Authentication Method -->
        <div>
          <label class="form-label">Authentication Method</label>
          <div class="mt-2 space-y-2">
            <label class="inline-flex items-center">
              <input
                v-model="authMethod"
                value="password"
                type="radio"
                class="w-4 h-4 text-indigo-600 dark:text-indigo-500 border-slate-300 dark:border-slate-600 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              />
              <span class="ml-2 text-sm text-slate-700 dark:text-slate-300">Password</span>
            </label>
            <label class="inline-flex items-center">
              <input
                v-model="authMethod"
                value="key"
                type="radio"
                class="w-4 h-4 text-indigo-600 dark:text-indigo-500 border-slate-300 dark:border-slate-600 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              />
              <span class="ml-2 text-sm text-slate-700 dark:text-slate-300">Private Key</span>
            </label>
            <label class="inline-flex items-center">
              <input
                v-model="authMethod"
                value="agent"
                type="radio"
                class="w-4 h-4 text-indigo-600 dark:text-indigo-500 border-slate-300 dark:border-slate-600 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              />
              <span class="ml-2 text-sm text-slate-700 dark:text-slate-300">SSH Agent</span>
            </label>
            <label class="inline-flex items-center">
              <input
                v-model="authMethod"
                value="credential"
                type="radio"
                class="w-4 h-4 text-indigo-600 dark:text-indigo-500 border-slate-300 dark:border-slate-600 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              />
              <span class="ml-2 text-sm text-slate-700 dark:text-slate-300">Saved Credential</span>
            </label>
          </div>
        </div>

        <!-- Credential Selection Field -->
        <div v-if="authMethod === 'credential'">
          <label for="credentialSelect" class="form-label">Select Credential</label>
          <select
            id="credentialSelect"
            v-model="selectedCredentialId"
            class="form-input"
            :class="{ 'border-red-300 dark:border-red-500': errors.credentialId }"
          >
            <option :value="null" disabled>-- Select a credential --</option>
            <option v-for="cred in credentialStore.credentials" :key="cred.id" :value="cred.id">
              {{ cred.name }} ({{ cred.username }})
            </option>
          </select>
          <p v-if="errors.credentialId" class="form-error">{{ errors.credentialId }}</p>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Manage your saved credentials in the <router-link to="/credentials" class="text-indigo-600 hover:underline">Credential Management</router-link> section.
          </p>
        </div>

        <!-- Password Field -->
        <div v-if="authMethod === 'password'">
          <label for="password" class="form-label">Password</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            class="form-input"
            :class="{ 'border-red-300 dark:border-red-500': errors.password }"
            placeholder="Enter password"
          />
          <p v-if="errors.password" class="form-error">{{ errors.password }}</p>
        </div>

        <!-- Private Key Field -->
        <div v-if="authMethod === 'key'">
          <label for="privateKey" class="form-label">Private Key</label>
          <textarea
            id="privateKey"
            v-model="form.privateKey"
            rows="4"
            class="form-input resize-none font-mono text-xs"
            :class="{ 'border-red-300 dark:border-red-500': errors.privateKey }"
            placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
          ></textarea>
          <p v-if="errors.privateKey" class="form-error">{{ errors.privateKey }}</p>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Paste your private key content here. The key will be encrypted before storage.
          </p>
          
          <!-- Key Passphrase Field -->
          <div class="mt-3">
            <label for="keyPassphrase" class="form-label">Passphrase (if key is encrypted)</label>
            <input
              id="keyPassphrase"
              v-model="form.keyPassphrase"
              type="password"
              class="form-input"
              :class="{ 'border-red-300 dark:border-red-500': errors.keyPassphrase }"
              placeholder="Enter passphrase for encrypted key"
            />
            <p v-if="errors.keyPassphrase" class="form-error">{{ errors.keyPassphrase }}</p>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              If your private key is encrypted, enter the passphrase to decrypt it.
            </p>
          </div>
        </div>

        <!-- SSH Agent Info -->
        <div v-if="authMethod === 'agent'" class="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded-lg p-3">
          <div class="flex">
            <svg class="h-5 w-5 text-indigo-500 dark:text-indigo-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            <div class="ml-3">
              <p class="text-sm text-indigo-700 dark:text-indigo-300">
                SSH Agent authentication will use your local SSH agent for authentication. 
                No password or key needs to be stored.
              </p>
            </div>
          </div>
        </div>

        <!-- Global Error -->
        <div v-if="globalError" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-3">
          <div class="flex">
            <svg class="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            <div class="ml-3">
              <p class="text-sm text-red-700 dark:text-red-300">{{ globalError }}</p>
            </div>
          </div>
        </div>
      </form>

      <div class="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3 rounded-b-xl">
        <button
          type="button"
          @click="$emit('close')"
          class="btn-outline"
        >
          Cancel
        </button>
        <button
          @click="handleSubmit"
          :disabled="loading"
          class="btn-primary"
        >
          <span v-if="loading" class="spinner mr-2"></span>
          {{ isEditing ? 'Update' : 'Create' }} Session
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useSessionStore } from '@/stores/sessionStore'
import { useCredentialStore } from '@/stores/credentialStore'

// Props
const props = defineProps({
  session: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits(['close', 'saved'])

// Store
const sessionStore = useSessionStore()
const credentialStore = useCredentialStore()

// State
const form = ref({
  name: '',
  hostname: '',
  port: 22,
  username: '',
  password: '',
  privateKey: '',
  keyPassphrase: '',
  credentialId: null
})

const selectedCredentialId = ref(null)
const authMethod = ref('password')
const errors = ref({})
const globalError = ref('')
const loading = ref(false)

// Computed
const isEditing = computed(() => !!props.session)

// Methods
const validateForm = () => {
  errors.value = {}
  
  if (!form.value.name.trim()) {
    errors.value.name = 'Session name is required'
  }
  
  if (!form.value.hostname.trim()) {
    errors.value.hostname = 'Hostname is required'
  }
  
  if (!form.value.username.trim()) {
    errors.value.username = 'Username is required'
  }
  
  if (form.value.port && (isNaN(form.value.port) || form.value.port < 1 || form.value.port > 65535)) {
    errors.value.port = 'Port must be between 1 and 65535'
  }
  
  if (authMethod.value === 'password' && !form.value.password) {
    errors.value.password = 'Password is required'
  }
  
  if (authMethod.value === 'key' && !form.value.privateKey.trim()) {
    errors.value.privateKey = 'Private key is required'
  }

  if (authMethod.value === 'credential' && !selectedCredentialId.value) {
    errors.value.credentialId = 'Please select a saved credential'
  }
  
  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }
  
  loading.value = true
  globalError.value = ''
  
  try {
    const sessionData = {
      name: form.value.name.trim(),
      hostname: form.value.hostname.trim(),
      port: form.value.port || 22,
      username: form.value.username.trim(),
    };

    if (authMethod.value === 'credential') {
      sessionData.credentialId = selectedCredentialId.value;
      sessionData.password = ''; // Ensure direct password is not sent
      sessionData.privateKey = ''; // Ensure direct private key is not sent
      sessionData.keyPassphrase = ''; // Ensure direct passphrase is not sent
    } else {
      sessionData.password = authMethod.value === 'password' ? form.value.password : '';
      sessionData.privateKey = authMethod.value === 'key' ? form.value.privateKey.trim() : '';
      sessionData.keyPassphrase = authMethod.value === 'key' ? form.value.keyPassphrase : '';
      sessionData.credentialId = null; // Ensure credentialId is not sent if not using a saved credential
    }
    
    let result
    if (isEditing.value) {
      result = await sessionStore.updateSession(props.session.id, sessionData)
    } else {
      result = await sessionStore.createSession(sessionData)
    }
    
    if (result.success) {
      emit('saved', result.session)
    } else {
      globalError.value = result.error || 'Failed to save session'
    }
  } catch (error) {
    globalError.value = error.message || 'An unexpected error occurred'
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  form.value = {
    name: '',
    hostname: '',
    port: 22,
    username: '',
    password: '',
    privateKey: '',
    keyPassphrase: '',
    credentialId: null
  }
  authMethod.value = 'password'
  selectedCredentialId.value = null
  errors.value = {}
  globalError.value = ''
}

const loadSession = () => {
  if (props.session) {
    form.value = {
      name: props.session.name || '',
      hostname: props.session.hostname || '',
      port: props.session.port || 22,
      username: props.session.username || '',
      password: '', // Don't pre-fill password for security
      privateKey: '', // Don't pre-fill private key for security
      keyPassphrase: '', // Don't pre-fill passphrase for security
      credentialId: props.session.credentialId || null
    };

    // Determine auth method based on existing session
    if (props.session.credentialId) {
      authMethod.value = 'credential';
      selectedCredentialId.value = props.session.credentialId;
    } else if (props.session.hasPassword) {
      authMethod.value = 'password';
    } else if (props.session.hasPrivateKey) {
      authMethod.value = 'key';
    } else {
      authMethod.value = 'agent';
    }
  }
};

// Watchers
watch(() => authMethod.value, () => {
  // Clear auth-related errors when method changes
  delete errors.value.password
  delete errors.value.privateKey
  delete errors.value.keyPassphrase
  
  // Clear auth-related form fields
  if (authMethod.value !== 'password') {
    form.value.password = ''
  }
  if (authMethod.value !== 'key') {
    form.value.privateKey = ''
    form.value.keyPassphrase = ''
  }
})

watch(selectedCredentialId, (newVal) => {
  if (newVal) {
    const selectedCred = credentialStore.credentials.find(c => c.id === newVal);
    if (selectedCred) {
      form.value.username = selectedCred.username;
      // Clear direct credentials when a saved credential is selected
      form.value.password = '';
      form.value.privateKey = '';
      form.value.keyPassphrase = '';
    }
  }
});

// Lifecycle
onMounted(async () => {
  await credentialStore.fetchCredentials();
  if (props.session) {
    loadSession();
  }
});
</script>