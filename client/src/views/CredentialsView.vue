<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="px-4 py-6 sm:px-0">
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div class="flex items-center">
            <h1 class="text-3xl font-bold text-slate-900 dark:text-white">{{ $t('message.credential_management') }}</h1>
          </div>
          <div class="flex space-x-3">
            <button
              @click="openAddModal"
              class="btn-primary"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {{ $t('message.add_new_credential') }}
            </button>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <h2 class="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">{{ $t('message.your_saved_credentials') }}</h2>
        <p v-if="credentialStore.loading" class="text-gray-600 dark:text-gray-400">{{ $t('message.loading_credentials') }}</p>
        <p v-else-if="credentialStore.credentials.length === 0" class="text-gray-600 dark:text-gray-400">{{ $t('message.no_credentials_saved') }}</p>
        <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <CredentialCard
            v-for="credential in credentialStore.credentials"
            :key="credential.id"
            :credential="credential"
            @edit="openEditModal"
            @delete="confirmDelete"
          />
        </div>
      </div>

      <CredentialFormModal
        v-if="showCredentialModal"
        :credential="selectedCredentialForEdit"
        @close="closeModal"
        @saved="handleCredentialSaved"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useCredentialStore } from '../stores/credentialStore';
import { useI18n } from 'vue-i18n';
import CredentialFormModal from '../components/CredentialFormModal.vue';
import CredentialCard from '../components/CredentialCard.vue';

const credentialStore = useCredentialStore();
const { t } = useI18n();

const showCredentialModal = ref(false);
const selectedCredentialForEdit = ref(null);

onMounted(() => {
  credentialStore.fetchCredentials();
});

const openAddModal = () => {
  selectedCredentialForEdit.value = null; // For adding new
  showCredentialModal.value = true;
};

const openEditModal = (credential) => {
  selectedCredentialForEdit.value = credential;
  showCredentialModal.value = true;
};

const closeModal = () => {
  showCredentialModal.value = false;
  selectedCredentialForEdit.value = null;
  credentialStore.error = null; // Clear any previous errors
};

const handleCredentialSaved = () => {
  credentialStore.fetchCredentials(); // Refresh the list after save
};

const confirmDelete = async (id) => {
  if (confirm(t('message.confirm_delete_credential'))) {
    try {
      await credentialStore.deleteCredential(id);
    } catch (error) {
      console.error('Failed to delete credential:', error);
    }
  }
};
</script>

<style scoped>
.btn-primary {
  @apply inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:focus:ring-offset-slate-800;
}
</style>
