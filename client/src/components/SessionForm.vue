<template>
  <div class="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center transition-all duration-200">
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full mx-4 max-h-screen overflow-y-auto animate-fade-in">
      <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <h3 class="text-xl font-medium text-slate-900 dark:text-white">
          {{ isEditing ? $t('message.edit_session') : $t('message.new_session_form') }}
        </h3>
      </div>

      <form @submit.prevent="handleSubmit" class="px-6 py-5 space-y-5">
        <!-- Session Name -->
        <div>
          <label for="name" class="form-label">{{ $t('message.session_name') }}</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            required
            class="form-input"
            :class="{ 'border-red-300 dark:border-red-500': errors.name }"
            :placeholder="$t('message.my_server')"
          />
          <p v-if="errors.name" class="form-error">{{ errors.name }}</p>
        </div>

        <!-- Hostname -->
        <div>
          <label for="hostname" class="form-label">{{ $t('message.hostname_ip_label') }}</label>
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
            <label for="port" class="form-label">{{ $t('message.port_label') }}</label>
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
            <label for="username" class="form-label">{{ $t('message.username_label_form') }}</label>
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
          <label class="form-label">{{ $t('message.authentication_method') }}</label>
          <div class="mt-2 space-y-2">
            <label class="inline-flex items-center">
              <input
                v-model="authMethod"
                value="password"
                type="radio"
                class="w-4 h-4 text-indigo-600 dark:text-indigo-500 border-slate-300 dark:border-slate-600 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              />
              <span class="ml-2 text-sm text-slate-700 dark:text-slate-300">{{ $t('message.password_auth') }}</span>
            </label>
            <label class="inline-flex items-center">
              <input
                v-model="authMethod"
                value="key"
                type="radio"
                class="w-4 h-4 text-indigo-600 dark:text-indigo-500 border-slate-300 dark:border-slate-600 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              />
              <span class="ml-2 text-sm text-slate-700 dark:text-slate-300">{{ $t('message.private_key_auth') }}</span>
            </label>
            <label class="inline-flex items-center">
              <input
                v-model="authMethod"
                value="agent"
                type="radio"
                class="w-4 h-4 text-indigo-600 dark:text-indigo-500 border-slate-300 dark:border-slate-600 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              />
              <span class="ml-2 text-sm text-slate-700 dark:text-slate-300">{{ $t('message.ssh_agent_auth') }}</span>
            </label>
            <label class="inline-flex items-center">
              <input
                v-model="authMethod"
                value="credential"
                type="radio"
                class="w-4 h-4 text-indigo-600 dark:text-indigo-500 border-slate-300 dark:border-slate-600 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              />
              <span class="ml-2 text-sm text-slate-700 dark:text-slate-300">{{ $t('message.saved_credential_auth') }}</span>
            </label>
          </div>
        </div>

        <!-- Credential Selection Field -->
        <div v-if="authMethod === 'credential'">
          <label for="credentialSelect" class="form-label">{{ $t('message.select_credential') }}</label>
          <select
            id="credentialSelect"
            v-model="selectedCredentialId"
            class="form-input"
            :class="{ 'border-red-300 dark:border-red-500': errors.credentialId }"
          >
            <option :value="null" disabled>{{ $t('message.select_credential_placeholder') }}</option>
            <option v-for="cred in credentialStore.credentials" :key="cred.id" :value="cred.id">
              {{ cred.name }} ({{ cred.username }})
            </option>
          </select>
          <p v-if="errors.credentialId" class="form-error">{{ errors.credentialId }}</p>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {{ $t('message.manage_credentials_note') }}
          </p>
        </div>

        <!-- Password Field -->
        <div v-if="authMethod === 'password'">
          <label for="password" class="form-label">{{ $t('message.password_field_label') }}</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            class="form-input"
            :class="{ 'border-red-300 dark:border-red-500': errors.password }"
            :placeholder="$t('message.enter_password_placeholder_form')"
          />
          <p v-if="errors.password" class="form-error">{{ errors.password }}</p>
        </div>

        <!-- Private Key Field -->
        <div v-if="authMethod === 'key'">
          <label for="privateKey" class="form-label">{{ $t('message.private_key_field_label') }}</label>
          <textarea
            id="privateKey"
            v-model="form.privateKey"
            rows="4"
            class="form-input resize-none font-mono text-xs"
            :class="{ 'border-red-300 dark:border-red-500': errors.privateKey }"
            :placeholder="$t('message.private_key_placeholder_form')"
          ></textarea>
          <p v-if="errors.privateKey" class="form-error">{{ errors.privateKey }}</p>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {{ $t('message.private_key_storage_note') }}
          </p>
          
          <!-- Key Passphrase Field -->
          <div class="mt-3">
            <label for="keyPassphrase" class="form-label">{{ $t('message.passphrase_field_label') }}</label>
            <input
              id="keyPassphrase"
              v-model="form.keyPassphrase"
              type="password"
              class="form-input"
              :class="{ 'border-red-300 dark:border-red-500': errors.keyPassphrase }"
              :placeholder="$t('message.enter_passphrase_placeholder_form')"
            />
            <p v-if="errors.keyPassphrase" class="form-error">{{ errors.keyPassphrase }}</p>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {{ $t('message.passphrase_decrypt_note') }}
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
                {{ $t('message.ssh_agent_info') }}
              </p>
            </div>
          </div>
        </div>

        <!-- Tags -->
        <div>
          <label class="form-label">{{ $t('message.tags_label') }}</label>
          <div class="mt-1 space-y-3">
            <TagMultiSelect
              v-model="selectedTagIds"
              :tags="tagStore.tags"
              :loading="tagStore.loading"
              :placeholder="$t('message.select_tags_placeholder')"
            />
            <p v-if="!tagStore.loading && !tagStore.tags.length" class="text-sm text-slate-500 dark:text-slate-400">
              {{ $t('message.no_tags_yet') }}
            </p>

            <div class="flex flex-col sm:flex-row gap-2">
              <input
                v-model="newTagName"
                type="text"
                class="form-input flex-1"
                :placeholder="$t('message.new_tag_placeholder')"
              />
              <button
                type="button"
                class="btn-outline sm:w-auto"
                @click="createNewTag"
                :disabled="creatingTag"
              >
                <span v-if="creatingTag" class="spinner mr-2"></span>
                {{ $t('message.add_tag') }}
              </button>
            </div>
            <p v-if="tagError" class="form-error mt-1">{{ tagError }}</p>
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
          {{ $t('message.cancel') }}
        </button>
        <button
          @click="handleSubmit"
          :disabled="loading"
          class="btn-primary"
        >
          <span v-if="loading" class="spinner mr-2"></span>
          {{ isEditing ? $t('message.update_session') : $t('message.create_session') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useSessionStore } from '@/stores/sessionStore'
import { useCredentialStore } from '@/stores/credentialStore'
import { useTagStore } from '@/stores/tagStore'
import TagMultiSelect from '@/components/TagMultiSelect.vue'
import { useI18n } from 'vue-i18n'

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
const tagStore = useTagStore()
const { t } = useI18n()

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
const selectedTagIds = ref([])
const newTagName = ref('')
const tagError = ref('')
const creatingTag = ref(false)

// Computed
const isEditing = computed(() => !!props.session)

// Methods
const validateForm = () => {
  errors.value = {}
  
  if (!form.value.name.trim()) {
    errors.value.name = t('message.session_name_required')
  }
  
  if (!form.value.hostname.trim()) {
    errors.value.hostname = t('message.hostname_required')
  }
  
  if (!form.value.username.trim()) {
    errors.value.username = t('message.username_required_form')
  }
  
  if (form.value.port && (isNaN(form.value.port) || form.value.port < 1 || form.value.port > 65535)) {
    errors.value.port = t('message.port_range_error')
  }
  
  if (authMethod.value === 'password' && !form.value.password) {
    errors.value.password = t('message.password_required_form')
  }
  
  if (authMethod.value === 'key' && !form.value.privateKey.trim()) {
    errors.value.privateKey = t('message.private_key_required_form')
  }

  if (authMethod.value === 'credential' && !selectedCredentialId.value) {
    errors.value.credentialId = t('message.select_credential_required')
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

    sessionData.tags = [...selectedTagIds.value]

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
      try {
        await tagStore.fetchTags()
      } catch (fetchError) {
        console.warn('Failed to refresh tags after saving session:', fetchError)
      }
      emit('saved', result.session)
    } else {
      globalError.value = result.error || t('message.failed_to_save_session')
    }
  } catch (error) {
    globalError.value = error.message || t('message.unexpected_error_session_form')
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
  selectedTagIds.value = []
  newTagName.value = ''
  tagError.value = ''
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

    selectedTagIds.value = Array.isArray(props.session.tags)
      ? props.session.tags.map(tag => tag.id)
      : []
    newTagName.value = ''
    tagError.value = ''

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

const createNewTag = async () => {
  tagError.value = ''

  const name = newTagName.value.trim()
  if (!name) {
    tagError.value = t('message.tag_name_required')
    return
  }

  creatingTag.value = true

  try {
    const result = await tagStore.createTag(name)

    if (result.success && result.tag) {
      if (!selectedTagIds.value.includes(result.tag.id)) {
        selectedTagIds.value.push(result.tag.id)
      }
      newTagName.value = ''
    } else {
      tagError.value = result.error || t('message.tag_create_failed')
    }
  } catch (error) {
    tagError.value = error.message || t('message.tag_create_failed')
  } finally {
    creatingTag.value = false
  }
};

// Watchers
watch(() => props.session, (newSession) => {
  if (newSession) {
    loadSession()
  } else {
    resetForm()
  }
}, { immediate: true })

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
  await Promise.all([
    credentialStore.fetchCredentials(),
    tagStore.tags.length ? Promise.resolve() : tagStore.fetchTags()
  ])
});
</script>