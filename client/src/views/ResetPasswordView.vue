<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-slate-900 dark:text-white">
          Reset your password
        </h2>
        <p v-if="verifying" class="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          Verifying your reset link...
        </p>
        <p v-else-if="!invalidToken && !resetComplete" class="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          Hi {{ username }}! Create a new password for your account.
        </p>
      </div>
      
      <!-- Loading State -->
      <div v-if="verifying" class="flex justify-center my-8">
        <svg class="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      
      <!-- Invalid Token Message -->
      <div v-else-if="invalidToken" class="rounded-md bg-red-50 dark:bg-red-900 p-4 mt-6">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800 dark:text-red-200">
              Invalid or expired reset link
            </h3>
            <p class="mt-2 text-sm text-red-700 dark:text-red-300">
              This password reset link is invalid or has expired. Please request a new password reset link.
            </p>
            <div class="mt-4">
              <router-link 
                to="/forgot-password" 
                class="text-sm font-medium text-red-800 dark:text-red-200 hover:underline"
              >
                Request a new password reset
              </router-link>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Reset Complete Message -->
      <div v-else-if="resetComplete" class="rounded-md bg-green-50 dark:bg-green-900 p-4 mt-6">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-green-800 dark:text-green-200">
              Password reset successful!
            </h3>
            <p class="mt-2 text-sm text-green-700 dark:text-green-300">
              Your password has been reset successfully. You can now log in with your new password.
            </p>
            <div class="mt-4">
              <router-link 
                to="/login" 
                class="text-sm font-medium text-green-800 dark:text-green-200 hover:underline"
              >
                Go to login page
              </router-link>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Error Message -->
      <div v-else-if="errorMessage" class="rounded-md bg-red-50 dark:bg-red-900 p-4 mt-6">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-red-800 dark:text-red-200">
              {{ errorMessage }}
            </p>
          </div>
        </div>
      </div>
      
      <!-- Reset Password Form -->
      <form v-if="!verifying && !invalidToken && !resetComplete" class="mt-8 space-y-6" @submit.prevent="handleSubmit">
        <div class="rounded-md shadow-sm -space-y-px">
          <div class="mb-4">
            <label for="new-password" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              New Password
            </label>
            <input
              id="new-password"
              v-model="newPassword"
              name="newPassword"
              type="password"
              autocomplete="new-password"
              required
              class="appearance-none relative block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 placeholder-slate-500 text-slate-900 dark:text-white dark:bg-slate-700 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Enter new password"
            />
          </div>
          
          <div>
            <label for="confirm-password" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              v-model="confirmPassword"
              name="confirmPassword"
              type="password"
              autocomplete="new-password"
              required
              class="appearance-none relative block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 placeholder-slate-500 text-slate-900 dark:text-white dark:bg-slate-700 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Confirm new password"
            />
          </div>
        </div>
        
        <div v-if="passwordError" class="text-sm text-red-600 dark:text-red-400 mt-2">
          {{ passwordError }}
        </div>

        <div>
          <button
            type="submit"
            :disabled="loading || !canSubmit"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading" class="absolute left-0 inset-y-0 flex items-center pl-3">
              <!-- Loading spinner -->
              <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
            <span>{{ loading ? 'Resetting Password...' : 'Reset Password' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { useRoute, useRouter } from 'vue-router';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

// States
const token = ref(route.params.token || '');
const username = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const verifying = ref(true);
const invalidToken = ref(false);
const resetComplete = ref(false);
const errorMessage = ref('');
const passwordError = ref('');

// Computed
const canSubmit = computed(() => {
  // Can only submit if passwords match and are at least 6 characters long
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'Passwords do not match';
    return false;
  }
  
  if (newPassword.value.length < 6) {
    passwordError.value = 'Password must be at least 6 characters long';
    return false;
  }
  
  passwordError.value = '';
  return true;
});

// Methods
const verifyToken = async () => {
  verifying.value = true;
  invalidToken.value = false;
  
  try {
    const result = await authStore.verifyResetToken(token.value);
    
    if (result.success) {
      username.value = result.username;
      invalidToken.value = false;
    } else {
      invalidToken.value = true;
      errorMessage.value = result.error;
    }
  } catch (error) {
    console.error('Error verifying token:', error);
    invalidToken.value = true;
    errorMessage.value = 'Failed to verify reset token';
  } finally {
    verifying.value = false;
  }
};

const handleSubmit = async () => {
  if (!canSubmit.value) return;
  
  loading.value = true;
  errorMessage.value = '';
  
  try {
    const result = await authStore.resetPassword(token.value, newPassword.value);
    
    if (result.success) {
      resetComplete.value = true;
    } else {
      errorMessage.value = result.error;
    }
  } catch (error) {
    console.error('Error resetting password:', error);
    errorMessage.value = 'An unexpected error occurred. Please try again.';
  } finally {
    loading.value = false;
  }
};

// Initialize
onMounted(() => {
  // Verify token when component mounts
  if (token.value) {
    verifyToken();
  } else {
    // No token in URL, redirect to forgot password
    router.replace('/forgot-password');
  }
});
</script>
