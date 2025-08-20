<template>
  <div class="container mx-auto p-4">
    <h1 class="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Credential Management</h1>

    <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-6">
      <h2 class="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">{{ editingCredential ? 'Edit Credential' : 'Add New Credential' }}</h2>
      <form @submit.prevent="saveCredential">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label for="credentialName" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
            <input type="text" id="credentialName" v-model="currentCredential.name" required
                   class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
          </div>
          <div>
            <label for="credentialType" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
            <select id="credentialType" v-model="currentCredential.type" required
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <option value="password">Password</option>
              <option value="private_key">Private Key</option>
            </select>
          </div>
        </div>

        <div class="mb-4">
          <label for="credentialUsername" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
          <input type="text" id="credentialUsername" v-model="currentCredential.username" required
                 class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
        </div>

        <div v-if="currentCredential.type === 'password'" class="mb-4">
          <label for="credentialPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
          <input type="password" id="credentialPassword" v-model="currentCredential.password"
                 :required="!editingCredential" autocomplete="new-password"
                 class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
          <p v-if="editingCredential" class="mt-1 text-sm text-gray-500 dark:text-gray-400">Leave blank to keep current password.</p>
        </div>

        <div v-if="currentCredential.type === 'private_key'" class="mb-4">
          <label for="credentialPrivateKey" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Private Key</label>
          <textarea id="credentialPrivateKey" v-model="currentCredential.privateKey" rows="6"
                    :required="!editingCredential"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-xs"></textarea>
          <p v-if="editingCredential" class="mt-1 text-sm text-gray-500 dark:text-gray-400">Leave blank to keep current private key.</p>
        </div>

        <div v-if="currentCredential.type === 'private_key'" class="mb-4">
          <label for="credentialPassphrase" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Passphrase (for Private Key)</label>
          <input type="password" id="credentialPassphrase" v-model="currentCredential.passphrase"
                 autocomplete="new-password"
                 class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
          <p v-if="editingCredential" class="mt-1 text-sm text-gray-500 dark:text-gray-400">Leave blank to keep current passphrase.</p>
        </div>

        <div class="flex justify-end space-x-3">
          <button type="submit" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            {{ editingCredential ? 'Update Credential' : 'Add Credential' }}
          </button>
          <button type="button" @click="cancelEdit" v-if="editingCredential" class="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
            Cancel
          </button>
        </div>
      </form>
      <p v-if="credentialStore.error" class="text-red-500 text-sm mt-4">Error: {{ credentialStore.error }}</p>
    </div>

    <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
      <h2 class="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">Your Saved Credentials</h2>
      <p v-if="credentialStore.loading" class="text-gray-600 dark:text-gray-400">Loading credentials...</p>
      <p v-else-if="credentialStore.credentials.length === 0" class="text-gray-600 dark:text-gray-400">No credentials saved yet.</p>
      <ul v-else class="divide-y divide-gray-200 dark:divide-gray-700">
        <li v-for="credential in credentialStore.credentials" :key="credential.id" class="py-4 flex items-center justify-between">
          <div>
            <p class="text-lg font-medium text-gray-900 dark:text-white">{{ credential.name }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">Type: {{ credential.type === 'password' ? 'Password' : 'Private Key' }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">Username: {{ credential.username }}</p>
          </div>
          <div class="flex space-x-3">
            <button @click="editCredential(credential)" class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
              Edit
            </button>
            <button @click="confirmDelete(credential.id)" class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
              Delete
            </button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useCredentialStore } from '../stores/credentialStore';

const credentialStore = useCredentialStore();

const defaultCredential = {
  id: null,
  name: '',
  type: 'password',
  username: '',
  password: '',
  privateKey: '',
  passphrase: '',
};

const currentCredential = ref({ ...defaultCredential });
const editingCredential = ref(false);

onMounted(() => {
  credentialStore.fetchCredentials();
});

const saveCredential = async () => {
  try {
    if (editingCredential.value) {
      await credentialStore.updateCredential(currentCredential.value.id, {
        name: currentCredential.value.name,
        type: currentCredential.value.type,
        username: currentCredential.value.username,
        password: currentCredential.value.type === 'password' ? currentCredential.value.password : undefined,
        privateKey: currentCredential.value.type === 'private_key' ? currentCredential.value.privateKey : undefined,
        passphrase: currentCredential.value.type === 'private_key' ? currentCredential.value.passphrase : undefined,
      });
    } else {
      await credentialStore.createCredential({
        name: currentCredential.value.name,
        type: currentCredential.value.type,
        username: currentCredential.value.username,
        password: currentCredential.value.type === 'password' ? currentCredential.value.password : undefined,
        privateKey: currentCredential.value.type === 'private_key' ? currentCredential.value.privateKey : undefined,
        passphrase: currentCredential.value.type === 'private_key' ? currentCredential.value.passphrase : undefined,
      });
    }
    resetForm();
  } catch (error) {
    // Error handled by store, just log here if needed
    console.error('Failed to save credential:', error);
  }
};

const editCredential = (credential) => {
  editingCredential.value = true;
  currentCredential.value = { ...credential, password: '', privateKey: '', passphrase: '' }; // Clear sensitive fields for editing
};

const cancelEdit = () => {
  resetForm();
};

const confirmDelete = async (id) => {
  if (confirm('Are you sure you want to delete this credential?')) {
    try {
      await credentialStore.deleteCredential(id);
    } catch (error) {
      console.error('Failed to delete credential:', error);
    }
  }
};

const resetForm = () => {
  editingCredential.value = false;
  currentCredential.value = { ...defaultCredential };
  credentialStore.error = null; // Clear any previous errors
};
</script>

<style scoped>
/* Add any component-specific styles here if necessary */
</style>
