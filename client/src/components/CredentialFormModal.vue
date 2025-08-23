<template>
  <div class="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center transition-all duration-200">
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full mx-4 max-h-screen overflow-y-auto animate-fade-in">
      <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <h3 class="text-xl font-medium text-slate-900 dark:text-white">
          {{ isEditing ? $t('message.edit_credential') : $t('message.add_new_credential') }}
        </h3>
      </div>

      <form @submit.prevent="handleSubmit" class="px-6 py-5 space-y-5">
        <div>
          <label for="credentialName" class="form-label">{{ $t('message.name') }}</label>
          <input type="text" id="credentialName" v-model="form.name" required
                 class="form-input"
                 :class="{ 'border-red-300 dark:border-red-500': errors.name }">
          <p v-if="errors.name" class="form-error">{{ errors.name }}</p>
        </div>
        <div>
          <label for="credentialType" class="form-label">{{ $t('message.type') }}</label>
          <select id="credentialType" v-model="form.type" required
                  class="form-input">
            <option value="password">{{ $t('message.password_type') }}</option>
            <option value="private_key">{{ $t('message.private_key_type') }}</option>
          </select>
        </div>

        <div>
          <label for="credentialUsername" class="form-label">{{ $t('message.username_label') }}</label>
          <input type="text" id="credentialUsername" v-model="form.username" required
                 class="form-input"
                 :class="{ 'border-red-300 dark:border-red-500': errors.username }">
          <p v-if="errors.username" class="form-error">{{ errors.username }}</p>
        </div>

        <div v-if="form.type === 'password'">
          <label for="credentialPassword" class="form-label">{{ $t('message.password_label') }}</label>
          <input type="password" id="credentialPassword" v-model="form.password"
                 :required="!isEditing" autocomplete="new-password"
                 class="form-input"
                 :class="{ 'border-red-300 dark:border-red-500': errors.password }">
          <p v-if="errors.password" class="form-error">{{ errors.password }}</p>
          <p v-if="isEditing" class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ $t('message.leave_blank_password') }}</p>
        </div>

        <div v-if="form.type === 'private_key'">
          <label for="credentialPrivateKey" class="form-label">{{ $t('message.private_key_label') }}</label>
          <textarea id="credentialPrivateKey" v-model="form.privateKey" rows="6"
                    :required="!isEditing"
                    class="form-input resize-none font-mono text-xs"
                    :class="{ 'border-red-300 dark:border-red-500': errors.privateKey }"></textarea>
          <p v-if="errors.privateKey" class="form-error">{{ errors.privateKey }}</p>
          <p v-if="isEditing" class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ $t('message.leave_blank_private_key') }}</p>
        </div>

        <div v-if="form.type === 'private_key'">
          <label for="credentialPassphrase" class="form-label">{{ $t('message.passphrase_label') }}</label>
          <input type="password" id="credentialPassphrase" v-model="form.passphrase"
                 autocomplete="new-password"
                 class="form-input"
                 :class="{ 'border-red-300 dark:border-red-500': errors.passphrase }">
          <p v-if="errors.passphrase" class="form-error">{{ errors.passphrase }}</p>
          <p v-if="isEditing" class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ $t('message.leave_blank_passphrase') }}</p>
        </div>
        
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
          {{ isEditing ? $t('message.update_credential') : $t('message.add_credential') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useCredentialStore } from '@/stores/credentialStore';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  credential: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close', 'saved']);

const credentialStore = useCredentialStore();
const { t } = useI18n();

const defaultForm = {
  id: null,
  name: '',
  type: 'password',
  username: '',
  password: '',
  privateKey: '',
  passphrase: '',
};

const form = ref({ ...defaultForm });
const errors = ref({});
const globalError = ref('');
const loading = ref(false);

const isEditing = computed(() => !!props.credential);

const validateForm = () => {
  errors.value = {};
  if (!form.value.name.trim()) {
    errors.value.name = t('message.credential_name_required');
  }
  if (!form.value.username.trim()) {
    errors.value.username = t('message.username_required_form');
  }
  if (form.value.type === 'password' && !form.value.password && !isEditing.value) {
    errors.value.password = t('message.password_required_form');
  }
  if (form.value.type === 'private_key' && !form.value.privateKey.trim() && !isEditing.value) {
    errors.value.privateKey = t('message.private_key_required_form');
  }
  return Object.keys(errors.value).length === 0;
};

const handleSubmit = async () => {
  if (!validateForm()) {
    return;
  }

  loading.value = true;
  globalError.value = '';

  try {
    const credentialData = {
      name: form.value.name.trim(),
      type: form.value.type,
      username: form.value.username.trim(),
    };

    if (form.value.type === 'password') {
      credentialData.password = form.value.password;
    } else {
      credentialData.privateKey = form.value.privateKey.trim();
      credentialData.passphrase = form.value.passphrase;
    }

    let result;
    if (isEditing.value) {
      result = await credentialStore.updateCredential(form.value.id, credentialData);
    } else {
      result = await credentialStore.createCredential(credentialData);
    }

    if (result.success) {
      emit('saved', result.credential);
      emit('close');
    } else {
      globalError.value = result.error || t('message.failed_to_save_credential');
    }
  } catch (error) {
    globalError.value = error.message || t('message.unexpected_error_credential_form');
  } finally {
    loading.value = false;
  }
};

const loadCredential = () => {
  if (props.credential) {
    form.value = { ...props.credential, password: '', privateKey: '', passphrase: '' }; // Clear sensitive fields
  }
};

watch(() => props.credential, (newVal) => {
  if (newVal) {
    loadCredential();
  } else {
    form.value = { ...defaultForm };
    errors.value = {};
    globalError.value = '';
  }
}, { immediate: true });

onMounted(() => {
  // No need to fetch credentials here, as it's done in CredentialsView
});
</script>

<style scoped>
/* Re-using form-input and form-label styles from SessionForm.vue */
.form-label {
  @apply block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1;
}

.form-input {
  @apply block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm;
}

.form-error {
  @apply mt-1 text-sm text-red-600 dark:text-red-400;
}

.btn-primary {
  @apply inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:focus:ring-offset-slate-800;
}

.btn-outline {
  @apply inline-flex justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 dark:focus:ring-offset-slate-800;
}

.spinner {
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
  -webkit-animation: spin 1s ease-in-out infinite;
  width: 16px;
  height: 16px;
  display: inline-block;
  vertical-align: middle;
}

@keyframes spin {
  to { -webkit-transform: rotate(360deg); }
}
@-webkit-keyframes spin {
  to { -webkit-transform: rotate(360deg); }
}
</style>
