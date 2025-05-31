import { defineStore } from 'pinia';
import axios from 'axios';
import { useAuthStore } from './authStore';

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: [],
    categories: [],
    loading: false,
    error: null,
    initialized: false
  }),
  
  getters: {
    // Get settings by category
    getSettingsByCategory: (state) => (category) => {
      return state.settings.filter(setting => setting.category === category);
    },
    
    // Get a single setting by id
    getSettingById: (state) => (id) => {
      return state.settings.find(setting => setting.id === id);
    },
    
    // Get value of a setting by id
    getSettingValue: (state) => (id) => {
      const setting = state.settings.find(setting => setting.id === id);
      return setting ? setting.value : null;
    },
    
    // Check if settings are loaded
    isLoaded: (state) => state.initialized && !state.loading,
    
    // Get unique categories
    uniqueCategories: (state) => {
      return [...new Set(state.settings.map(setting => setting.category))];
    }
  },
  
  actions: {
  // Fetch all settings
  async fetchSettings(forUser = false) {
    this.loading = true;
    this.error = null;
    
    try {
      const url = forUser ? '/api/settings?user=me' : '/api/settings';
      const response = await axios.get(url);
      this.settings = response.data;
      this.initialized = true;
      
      // Extract unique categories
      this.categories = [...new Set(this.settings.map(setting => setting.category))];
      
      return this.settings;
    } catch (error) {
      console.error('Error fetching settings:', error);
      
      // If access denied trying to fetch global settings, try user settings
      if (!forUser && error.response?.status === 403) {
        return this.fetchSettings(true);
      }
      
      this.error = error.response?.data?.error || 'Failed to load settings';
      throw error;
    } finally {
      this.loading = false;
    }
  },
    
  // Fetch settings by category
  async fetchSettingsByCategory(category, forUser = false) {
    this.loading = true;
    this.error = null;
    
    try {
      const url = forUser ? 
        `/api/settings/${category}?user=me` : 
        `/api/settings/${category}`;
      
      const response = await axios.get(url);
      
      // Update only the settings for this category
      const categorySettings = response.data;
      
      // Remove existing settings for this category
      this.settings = this.settings.filter(setting => setting.category !== category);
      
      // Add the new settings for this category
      this.settings.push(...categorySettings);
      
      return categorySettings;
    } catch (error) {
      console.error(`Error fetching ${category} settings:`, error);
      
      // If access denied trying to fetch global settings, try user settings
      if (!forUser && error.response?.status === 403) {
        return this.fetchSettingsByCategory(category, true);
      }
      
      this.error = error.response?.data?.error || `Failed to load ${category} settings`;
      throw error;
    } finally {
      this.loading = false;
    }
  },
    
  // Update multiple settings
  async updateSettings(settingsToUpdate, forUser = false) {
    this.loading = true;
    this.error = null;
    
    try {
      const payload = forUser ? 
        { settings: settingsToUpdate, user: 'me' } : 
        { settings: settingsToUpdate };
      
      const response = await axios.put('/api/settings', payload);
      
      // Update local settings with new values
      settingsToUpdate.forEach(updatedSetting => {
        const index = this.settings.findIndex(s => s.id === updatedSetting.id);
        if (index !== -1) {
          this.settings[index].value = updatedSetting.value;
          this.settings[index].updated_at = new Date().toISOString();
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error updating settings:', error);
      
      // If access denied trying to update global settings, try user settings
      if (!forUser && error.response?.status === 403) {
        return this.updateSettings(settingsToUpdate, true);
      }
      
      this.error = error.response?.data?.error || 'Failed to update settings';
      throw error;
    } finally {
      this.loading = false;
    }
  },
    
  // Update a single setting
  async updateSetting(id, value, forUser = false) {
    this.loading = true;
    this.error = null;
    
    try {
      const payload = forUser ? 
        { value, user: 'me' } : 
        { value };
      
      const response = await axios.put(`/api/settings/${id}`, payload);
      
      // Update local setting with new value
      const index = this.settings.findIndex(s => s.id === id);
      if (index !== -1) {
        this.settings[index].value = value;
        this.settings[index].updated_at = new Date().toISOString();
      }
      
      return response.data;
    } catch (error) {
      console.error(`Error updating setting ${id}:`, error);
      
      // If access denied trying to update global setting, try user setting
      if (!forUser && error.response?.status === 403) {
        return this.updateSetting(id, value, true);
      }
      
      this.error = error.response?.data?.error || 'Failed to update setting';
      throw error;
    } finally {
      this.loading = false;
    }
  },
    
  // Reset settings to defaults
  async resetSettings(forUser = false) {
    this.loading = true;
    this.error = null;
    
    try {
      console.log('Sending reset request to API');
      
      const payload = forUser ? { user: 'me' } : {};
      const response = await axios.post('/api/settings/reset', payload);
      
      console.log('Reset response:', response.data);
      
      // Reload settings after reset
      console.log('Reloading settings after reset');
      await this.fetchSettings(forUser);
      console.log('Settings reloaded successfully');
      
      return response.data;
    } catch (error) {
      console.error('Error resetting settings:', error);
      
      // If access denied trying to reset global settings, try user settings
      if (!forUser && error.response?.status === 403) {
        return this.resetSettings(true);
      }
      
      this.error = error.response?.data?.error || 'Failed to reset settings';
      
      // Log detailed error information
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
      
      throw error;
    } finally {
      this.loading = false;
    }
  },
  
  // Check if user is admin
  isAdmin() {
    const authStore = useAuthStore();
    return authStore.user?.role === 'admin';
  }
  }
});
