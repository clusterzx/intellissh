<template>
  <div class="max-w-6xl mx-auto px-4 py-8">
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">Settings</h1>
          <p class="text-slate-600 dark:text-slate-400">
            Configure application settings. Changes will be applied immediately.
          </p>
        </div>
        <div v-if="isAdmin" class="px-3 py-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300 rounded-lg text-sm font-medium">
          Admin
        </div>
      </div>
      
      <div class="mt-4 flex justify-end space-x-4">
        <button 
          v-if="isAdmin"
          @click="toggleSettingsScope"
          class="text-sm px-3 py-1 rounded border border-slate-300 dark:border-slate-500 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          :class="{'bg-slate-100 dark:bg-slate-700': !userSettings}"
        >
          {{ userSettings ? 'Switch to Global Settings' : 'Switch to User Settings' }}
        </button>
        <button
          @click="reloadSettings"
          class="text-sm px-3 py-1 rounded border border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
        >
          Reload Settings
        </button>
        <button
          @click="resetSettings"
          class="text-sm px-3 py-1 rounded border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
        >
          Reset {{ userSettings ? 'My' : 'All' }} Settings
        </button>
      </div>
    </div>

    <div v-if="settingsStore.loading" class="my-8 flex justify-center">
      <div class="spinner"></div>
    </div>

    <div v-else-if="settingsStore.error" class="my-8 p-4 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-lg">
      <p class="font-medium">{{ settingsStore.error }}</p>
      <button @click="loadSettings" class="mt-2 btn-secondary py-1 px-3 text-sm">
        Retry
      </button>
    </div>

    <div v-else-if="settingsStore.settings.length === 0" class="my-8 p-4 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 rounded-lg">
      <p>No settings found. Click the button below to reset to defaults.</p>
      <div class="mt-2 flex flex-wrap gap-2">
        <button 
          @click.prevent="resetSettings" 
          class="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg font-medium focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
        >
          Reset to Defaults
        </button>
        <button 
          @click.prevent="directReset" 
          class="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
        >
          Direct Reset
        </button>
        <button 
          @click.prevent="publicReset" 
          class="bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg font-medium focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
        >
          Public Reset
        </button>
        <button 
          @click.prevent="testApi" 
          class="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
        >
          Test API
        </button>
      </div>
      
      <div v-if="apiResponse" class="mt-4 p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-600">
        <h3 class="font-medium mb-1 text-slate-900 dark:text-white">API Response:</h3>
        <pre class="text-xs overflow-auto p-2 bg-slate-100 dark:bg-slate-800 rounded max-h-40">{{ JSON.stringify(apiResponse, null, 2) }}</pre>
      </div>
    </div>

    <div v-else>
      <!-- Category Tabs -->
      <div class="mb-6 border-b border-slate-200 dark:border-slate-700">
        <div class="flex flex-wrap -mb-px">
          <button
            v-for="category in visibleCategories"
            :key="category"
            @click="activeCategory = category"
            class="py-2 px-4 text-sm font-medium border-b-2 -mb-px transition-colors"
            :class="activeCategory === category
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'"
          >
            {{ getCategoryLabel(category) }}
          </button>
        </div>
      </div>

      <!-- Settings Form -->
      <div class="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 mb-6">
        <form @submit.prevent="saveSettings">
          <!-- Active Category Settings -->
          <div v-for="setting in activeCategorySettings" :key="setting.id" class="mb-6">
            <div class="mb-2">
              <label :for="setting.id" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {{ setting.name }}
              </label>
              <p v-if="setting.description" class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {{ setting.description }}
              </p>
            </div>

            <!-- Text input for most settings -->
            <div v-if="!isSpecialInput(setting.id) && !(setting.id === 'jwt_expires_in' && (!isAdmin || userSettings))" class="relative">
              <input
                :id="setting.id"
                v-model="formValues[setting.id]"
                :type="setting.is_sensitive && !showSensitive[setting.id] ? 'password' : 'text'"
                class="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                :placeholder="getPlaceholder(setting)"
              />
              <button
                v-if="setting.is_sensitive"
                type="button"
                @click="toggleSensitive(setting.id)"
                class="absolute right-2 top-2 text-slate-500 dark:text-slate-400"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5"
                  :class="{ 'text-indigo-500': showSensitive[setting.id] }"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    v-if="showSensitive[setting.id]"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    v-if="showSensitive[setting.id]"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                  <path
                    v-else
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              </button>
            </div>

            <!-- Select for LLM Provider -->
            <div v-else-if="setting.id === 'llm_provider'">
              <select
                :id="setting.id"
                v-model="formValues[setting.id]"
                class="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
              >
                <option value="openai">OpenAI</option>
                <option value="ollama">Ollama</option>
              </select>
            </div>
            
            <!-- Toggle for Registration Enabled -->
            <div v-else-if="setting.id === 'registration_enabled' && isAdmin && !userSettings">
              <div class="relative inline-block w-10 mr-2 align-middle select-none">
                <input 
                  :id="setting.id" 
                  type="checkbox" 
                  :checked="formValues[setting.id] === 'true'" 
                  @change="toggleRegistration"
                  class="sr-only"
                />
                <div class="block h-6 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                <div 
                  class="dot absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition"
                  :class="formValues[setting.id] === 'true' ? 'transform translate-x-4 bg-indigo-500' : ''"
                ></div>
              </div>
              <label :for="setting.id" class="inline-block ml-2">
                {{ formValues[setting.id] === 'true' ? 'Enabled' : 'Disabled' }}
              </label>
            </div>

            <!-- Select for OpenAI Model -->
            <div v-else-if="setting.id === 'openai_model'">
              <select
                :id="setting.id"
                v-model="formValues[setting.id]"
                class="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
              >
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4.1">GPT-4.1</option>
                <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
                <option value="gpt-4.1-nano">GPT-4.1 Nano</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4-32k">GPT-4 32k</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
            </div>

            <!-- Text input for Ollama Model -->
            <div v-else-if="setting.id === 'ollama_model'">
              <input
                :id="setting.id"
                v-model="formValues[setting.id]"
                type="text"
                class="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                placeholder="Enter model name (e.g., llama2, mistral, gemma)"
              />
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Enter any model name available in your Ollama installation
              </p>
            </div>
          </div>

          <div class="flex space-x-4 mt-8">
            <button
              type="submit"
              class="btn-primary px-4 py-2"
              :disabled="!hasChanges || isSaving"
            >
              <span v-if="isSaving">Saving...</span>
              <span v-else>Save Changes</span>
            </button>
            <button
              type="button"
              @click="resetForm"
              class="btn-secondary px-4 py-2"
              :disabled="!hasChanges || isSaving"
            >
              Reset Form
            </button>
            <button
              type="button"
              @click="resetSettings"
              class="btn-ghost px-4 py-2"
              :disabled="isSaving"
            >
              Reset to Defaults
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import axios from 'axios';

const settingsStore = useSettingsStore();
const authStore = useAuthStore();
const activeCategory = ref('email');
const formValues = ref({});
const originalValues = ref({});
const showSensitive = ref({});
const isSaving = ref(false);
const userSettings = ref(false);
const isAdmin = computed(() => authStore.user?.role === 'admin');

// Computed property to filter visible categories based on user role and settings mode
const visibleCategories = computed(() => {
  const allCategories = settingsStore.uniqueCategories;
  
  // If user is admin and in global settings mode, show all categories
  if (isAdmin.value && !userSettings.value) {
    return allCategories;
  }
  
  // Otherwise, filter out admin-only categories
  return allCategories.filter(category => category !== 'email');
});

// Computed property to get settings for the active category
const activeCategorySettings = computed(() => {
  return settingsStore.getSettingsByCategory(activeCategory.value);
});

// Computed property to check if there are any changes
const hasChanges = computed(() => {
  for (const id in formValues.value) {
    if (formValues.value[id] !== originalValues.value[id]) {
      return true;
    }
  }
  return false;
});

// Method to get a human-readable label for a category
const getCategoryLabel = (category) => {
  switch (category) {
    case 'llm':
      return 'LLM Settings';
    case 'security':
      return 'Security';
    case 'server':
      return 'Server';
    case 'email':
      return 'Email Settings';
    default:
      return category.charAt(0).toUpperCase() + category.slice(1);
  }
};

// Method to get placeholder text
const getPlaceholder = (setting) => {
  if (setting.is_sensitive) {
    return setting.value ? '••••••••' : 'Enter value...';
  }
  return 'Enter value...';
};

// Method to check if a setting has a special input type
const isSpecialInput = (id) => {
  return ['llm_provider', 'openai_model', 'ollama_model'].includes(id);
};

// Method to toggle visibility of sensitive values
const toggleSensitive = (id) => {
  showSensitive.value[id] = !showSensitive.value[id];
};

// Method to load settings
const loadSettings = async () => {
  try {
    await settingsStore.fetchSettings(userSettings.value);
    initializeForm();
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
};

// Method to initialize the form with current values
const initializeForm = () => {
  formValues.value = {};
  originalValues.value = {};
  showSensitive.value = {};

  // Initialize form values from store
  settingsStore.settings.forEach(setting => {
    formValues.value[setting.id] = setting.value;
    originalValues.value[setting.id] = setting.value;
    
    // Initialize sensitive values to be hidden
    if (setting.is_sensitive) {
      showSensitive.value[setting.id] = false;
    }
  });
};

// Method to save settings
const saveSettings = async () => {
  isSaving.value = true;
  
  try {
    // Get settings from the current category
    let settingsToUpdate = activeCategorySettings.value.map(setting => ({
      id: setting.id,
      value: formValues.value[setting.id]
    }));
    
    // Filter out admin-only settings if the user is not an admin or if in user settings mode
    if (!isAdmin.value || userSettings.value) {
      const adminOnlySettings = [
        'registration_enabled', 
        'jwt_expires_in', 
        'rate_limit_window_ms', 
        'rate_limit_max_requests',
        // Email settings - admin only
        'smtp_host',
        'smtp_port',
        'smtp_user',
        'smtp_password',
        'email_from'
      ];
      
      settingsToUpdate = settingsToUpdate.filter(setting => !adminOnlySettings.includes(setting.id));
      console.log('Filtered settings to update (non-admin):', settingsToUpdate);
    } else {
      console.log('All settings to update (admin):', settingsToUpdate);
    }
    
    if (settingsToUpdate.length > 0) {
      const result = await settingsStore.updateSettings(settingsToUpdate, userSettings.value);
      console.log('Settings update result:', result);
      
      // Update original values after successful save
      settingsToUpdate.forEach(setting => {
        originalValues.value[setting.id] = formValues.value[setting.id];
        console.log(`Updated original value for ${setting.id} to ${originalValues.value[setting.id]}`);
      });
      
      // Verify admin settings if applicable
      if (isAdmin.value && !userSettings.value) {
        // Explicitly verify registration setting value if it was in the updated settings
        const regSetting = settingsToUpdate.find(s => s.id === 'registration_enabled');
        if (regSetting) {
          console.log(`Registration setting saved as: ${regSetting.value}`);
          
          // Verify the setting was saved correctly by fetching it again
          await settingsStore.fetchSettingsByCategory('server', userSettings.value);
          const updatedRegValue = settingsStore.getSettingValue('registration_enabled');
          console.log(`Registration setting value after refresh: ${updatedRegValue}`);
        }
      }
    }
  } catch (error) {
    console.error('Failed to save settings:', error);
    alert('Error saving settings: ' + (error.message || 'Unknown error'));
  } finally {
    isSaving.value = false;
  }
};

// Method to reset the form to original values
const resetForm = () => {
  for (const id in originalValues.value) {
    formValues.value[id] = originalValues.value[id];
  }
};

// Method to reset settings to defaults using the store
const resetSettings = async () => {
  console.log('Reset to defaults clicked');
  const message = userSettings.value 
    ? 'Are you sure you want to reset your personal settings? Global settings will still apply.' 
    : 'Are you sure you want to reset all global settings to default values? This cannot be undone.';
  
  const confirmed = confirm(message);
  if (!confirmed) return;
  
  isSaving.value = true;
  
  try {
    console.log(`Calling resetSettings API through store (userSettings: ${userSettings.value})`);
    await settingsStore.resetSettings(userSettings.value);
    console.log('Settings reset successful');
    initializeForm();
  } catch (error) {
    console.error('Failed to reset settings:', error);
    alert('Failed to reset settings: ' + (error.message || 'Unknown error'));
  } finally {
    isSaving.value = false;
  }
};

// Reload settings from the server
const reloadSettings = async () => {
  isSaving.value = true;
  try {
    console.log('Reloading all settings from server...');
    settingsStore.initialized = false;
    await loadSettings();
    alert('Settings reloaded successfully!');
  } catch (error) {
    console.error('Failed to reload settings:', error);
    alert('Error reloading settings: ' + (error.message || 'Unknown error'));
  } finally {
    isSaving.value = false;
  }
};

// Toggle between global and user settings
const toggleSettingsScope = async () => {
  userSettings.value = !userSettings.value;
  await loadSettings();
};

// Toggle registration enabled/disabled
const toggleRegistration = async () => {
  // Verify user is admin and in global settings mode
  if (!isAdmin.value || userSettings.value) {
    console.error('Only admin users can modify registration setting in global mode');
    alert('Permission denied: Only administrators can change this setting.');
    return;
  }
  
  // Get the current value
  const currentValue = formValues.value['registration_enabled'];
  console.log('Current registration enabled value:', currentValue);
  
  // Set the opposite value
  const newValue = currentValue === 'true' ? 'false' : 'true';
  console.log('New registration enabled value:', newValue);
  
  // Update immediately in the UI
  formValues.value['registration_enabled'] = newValue;
  originalValues.value['registration_enabled'] = newValue;
  
  // Save directly to the database using a single setting update
  isSaving.value = true;
  try {
    console.log(`Saving registration_enabled=${newValue} directly to database`);
    
    // Use updateSetting from the store to update just this one setting
    await axios.put('/api/settings/registration_enabled', { 
      value: newValue 
    });
    
    // Refresh the setting to verify it was saved correctly
    const response = await axios.get('/api/settings/server');
    const updatedSettings = response.data;
    const regSetting = updatedSettings.find(s => s.id === 'registration_enabled');
    
    if (regSetting) {
      console.log(`Registration setting value after direct save: ${regSetting.value}`);
      // Update the form value to match what's in the database
      formValues.value['registration_enabled'] = regSetting.value;
      originalValues.value['registration_enabled'] = regSetting.value;
    }
  } catch (error) {
    console.error('Failed to directly update registration setting:', error);
    alert('Error toggling registration: ' + (error.message || 'Unknown error'));
    
    // Revert to original value on error
    formValues.value['registration_enabled'] = currentValue;
  } finally {
    isSaving.value = false;
  }
};

// Direct reset bypassing the store - for troubleshooting
const directReset = async () => {
  console.log('Direct reset clicked');
  const confirmed = confirm('This will bypass the store and call the API directly. Continue?');
  if (!confirmed) return;
  
  isSaving.value = true;
  
  try {
    console.log('Calling reset API directly');
    const response = await axios.post('/api/settings/reset');
    console.log('Direct API response:', response.data);
    alert('Direct reset successful: ' + JSON.stringify(response.data));
    
    // Reload settings after reset
    await settingsStore.fetchSettings();
    initializeForm();
  } catch (error) {
    console.error('Direct reset failed:', error);
    alert('Direct reset failed: ' + (error.response?.data?.error || error.message || 'Unknown error'));
  } finally {
    isSaving.value = false;
  }
};

// Public reset - no authentication required
const apiResponse = ref(null);

const publicReset = async () => {
  console.log('Public reset clicked');
  const confirmed = confirm('This will call the public reset API endpoint. Continue?');
  if (!confirmed) return;
  
  isSaving.value = true;
  
  try {
    console.log('Calling public reset API');
    const response = await axios.post('/api/settings/public-reset');
    console.log('Public reset response:', response.data);
    apiResponse.value = response.data;
    
    // Reload settings after reset
    await settingsStore.fetchSettings();
    initializeForm();
  } catch (error) {
    console.error('Public reset failed:', error);
    apiResponse.value = {
      error: error.response?.data?.error || error.message || 'Unknown error',
      status: error.response?.status
    };
  } finally {
    isSaving.value = false;
  }
};

// Test API connectivity
const testApi = async () => {
  console.log('Testing API connection');
  
  try {
    const response = await axios.get('/api/settings/test');
    console.log('API test response:', response.data);
    apiResponse.value = response.data;
  } catch (error) {
    console.error('API test failed:', error);
    apiResponse.value = {
      error: error.response?.data?.error || error.message || 'Unknown error',
      status: error.response?.status
    };
  }
};

// Watch for changes to active category
watch(activeCategory, async (newCategory) => {
  // Only fetch if the store doesn't have settings for this category yet
  if (!settingsStore.getSettingsByCategory(newCategory).length && settingsStore.initialized) {
    try {
      await settingsStore.fetchSettingsByCategory(newCategory, userSettings.value);
      initializeForm();
    } catch (error) {
      console.error(`Failed to load ${newCategory} settings:`, error);
    }
  }
});

// Initial load
onMounted(async () => {
  if (!settingsStore.initialized) {
    await loadSettings();
  } else {
    initializeForm();
  }
  
  // Set initial active category based on user role
  if (!isAdmin.value || userSettings.value) {
    // For non-admins or user settings mode, default to LLM settings
    activeCategory.value = 'llm';
  } else {
    // For admins in global mode, default to Email settings
    activeCategory.value = 'email';
  }
});
</script>

<style scoped>
/* Toggle Switch Styles */
.dot {
  transition: transform 0.3s ease-in-out, background-color 0.3s ease-in-out;
}

input:checked ~ .dot {
  transform: translateX(1rem);
}

.block {
  transition: background-color 0.3s ease-in-out;
}
</style>
