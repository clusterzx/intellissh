import { defineStore } from 'pinia';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const useCredentialStore = defineStore('credential', {
  state: () => ({
    credentials: [],
    loading: false,
    error: null,
  }),
  actions: {
    async fetchCredentials() {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.get(`${API_URL}/credentials`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        this.credentials = response.data;
      } catch (err) {
        this.error = err.response?.data?.message || err.message;
        console.error('Error fetching credentials:', err);
      } finally {
        this.loading = false;
      }
    },
    async createCredential(credentialData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.post(`${API_URL}/credentials`, credentialData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        this.credentials.push(response.data);
        return response.data;
      } catch (err) {
        this.error = err.response?.data?.message || err.message;
        console.error('Error creating credential:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async updateCredential(id, credentialData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.put(`${API_URL}/credentials/${id}`, credentialData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const index = this.credentials.findIndex((cred) => cred.id === id);
        if (index !== -1) {
          this.credentials[index] = { ...this.credentials[index], ...response.data };
        }
        return response.data;
      } catch (err) {
        this.error = err.response?.data?.message || err.message;
        console.error('Error updating credential:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async deleteCredential(id) {
      this.loading = true;
      this.error = null;
      try {
        await axios.delete(`${API_URL}/credentials/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        this.credentials = this.credentials.filter((cred) => cred.id !== id);
      } catch (err) {
        this.error = err.response?.data?.message || err.message;
        console.error('Error deleting credential:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    },
  },
});
