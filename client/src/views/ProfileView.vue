<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">{{ $t('message.user_profile') }}</h1>
      <p class="text-slate-600 dark:text-slate-400">
        {{ $t('message.update_profile_info') }}
      </p>
    </div>

    <!-- Profile information section -->
    <div class="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 mb-6">
      <h2 class="text-xl font-semibold text-slate-900 dark:text-white mb-4">{{ $t('message.profile_information') }}</h2>
      
      <div class="mb-6">
        <div class="flex items-center mb-4">
          <div class="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-300 text-xl font-bold mr-4">
            {{ usernameInitial }}
          </div>
          <div>
            <div class="text-lg font-medium text-slate-900 dark:text-white">{{ username }}</div>
            <div class="text-sm text-slate-500 dark:text-slate-400">{{ $t('message.joined') }} {{ formattedJoinDate }}</div>
          </div>
        </div>
      </div>

      <!-- Email Form -->
      <form @submit.prevent="updateEmail">
        <div class="mb-4">
          <label for="email" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {{ $t('message.email_address') }}
          </label>
          <input 
            id="email" 
            v-model="email" 
            type="email" 
            class="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
            :placeholder="$t('message.enter_email_address')"
          />
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {{ $t('message.email_notifications_recovery') }}
          </p>
        </div>
        
        <div class="mb-2">
          <button 
            type="submit" 
            class="btn-primary px-4 py-2" 
            :disabled="!isEmailChanged || authStore.isLoading"
          >
            <span v-if="authStore.isLoading">{{ $t('message.saving') }}</span>
            <span v-else>{{ $t('message.save_email') }}</span>
          </button>
        </div>
        
        <div v-if="emailUpdateMessage" class="mt-2 text-sm text-green-600 dark:text-green-400">
          {{ emailUpdateMessage }}
        </div>
        <div v-if="emailUpdateError" class="mt-2 text-sm text-red-600 dark:text-red-400">
          {{ emailUpdateError }}
        </div>
      </form>
    </div>

    <!-- Password section -->
    <div class="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
      <h2 class="text-xl font-semibold text-slate-900 dark:text-white mb-4">{{ $t('message.change_password') }}</h2>
      
      <form @submit.prevent="updatePassword">
        <div class="mb-4">
          <label for="current-password" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {{ $t('message.current_password') }}
          </label>
          <input 
            id="current-password" 
            v-model="currentPassword" 
            type="password" 
            class="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
            :placeholder="$t('message.enter_current_password')"
          />
        </div>
        
        <div class="mb-4">
          <label for="new-password" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {{ $t('message.new_password') }}
          </label>
          <input 
            id="new-password" 
            v-model="newPassword" 
            type="password" 
            class="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
            :placeholder="$t('message.enter_new_password')"
          />
        </div>
        
        <div class="mb-4">
          <label for="confirm-password" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {{ $t('message.confirm_new_password') }}
          </label>
          <input 
            id="confirm-password" 
            v-model="confirmPassword" 
            type="password" 
            class="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
            :placeholder="$t('message.confirm_new_password_placeholder')"
          />
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {{ $t('message.password_min_length_profile') }}
          </p>
        </div>
        
        <div class="mb-2">
          <button 
            type="submit" 
            class="btn-primary px-4 py-2" 
            :disabled="!canUpdatePassword || authStore.isLoading"
          >
            <span v-if="authStore.isLoading">{{ $t('message.updating') }}</span>
            <span v-else>{{ $t('message.change_password') }}</span>
          </button>
        </div>
        
        <div v-if="passwordUpdateMessage" class="mt-2 text-sm text-green-600 dark:text-green-400">
          {{ passwordUpdateMessage }}
        </div>
        <div v-if="passwordUpdateError" class="mt-2 text-sm text-red-600 dark:text-red-400">
          {{ passwordUpdateError }}
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { useI18n } from 'vue-i18n';

const authStore = useAuthStore();
const { t } = useI18n();

// User info
const username = computed(() => authStore.currentUser?.username || '');
const usernameInitial = computed(() => username.value.charAt(0).toUpperCase() || '');
const joinDate = computed(() => authStore.currentUser?.created_at ? new Date(authStore.currentUser.created_at) : new Date());
const formattedJoinDate = computed(() => {
  return joinDate.value.toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
});

// Email form
const email = ref('');
const emailUpdateMessage = ref('');
const emailUpdateError = ref('');
const originalEmail = ref('');

// Password form
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const passwordUpdateMessage = ref('');
const passwordUpdateError = ref('');

// Computed properties
const isEmailChanged = computed(() => {
  return email.value !== originalEmail.value;
});

const canUpdatePassword = computed(() => {
  return (
    currentPassword.value && 
    newPassword.value && 
    confirmPassword.value && 
    newPassword.value === confirmPassword.value &&
    newPassword.value.length >= 6
  );
});

// Methods
const updateEmail = async () => {
  if (!isEmailChanged.value) return;
  
  emailUpdateMessage.value = '';
  emailUpdateError.value = '';
  
  try {
    const result = await authStore.updateProfile({ email: email.value });
    
    if (result.success) {
      emailUpdateMessage.value = t('message.email_updated_successfully');
      originalEmail.value = email.value;
      
      // Clear message after a few seconds
      setTimeout(() => {
        emailUpdateMessage.value = '';
      }, 3000);
    } else {
      emailUpdateError.value = t('message.failed_to_update_email');
    }
  } catch (error) {
    console.error('Error updating email:', error);
    emailUpdateError.value = t('message.unexpected_error_email');
  }
};

const updatePassword = async () => {
  if (!canUpdatePassword.value) return;
  
  passwordUpdateMessage.value = '';
  passwordUpdateError.value = '';
  
  if (newPassword.value !== confirmPassword.value) {
    passwordUpdateError.value = t('message.passwords_do_not_match_profile');
    return;
  }
  
  if (newPassword.value.length < 6) {
    passwordUpdateError.value = t('message.password_min_length_error');
    return;
  }
  
  try {
    const result = await authStore.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value
    });
    
    if (result.success) {
      passwordUpdateMessage.value = t('message.password_changed_successfully');
      
      // Clear form
      currentPassword.value = '';
      newPassword.value = '';
      confirmPassword.value = '';
      
      // Clear message after a few seconds
      setTimeout(() => {
        passwordUpdateMessage.value = '';
      }, 3000);
    } else {
      passwordUpdateError.value = result.error || t('message.failed_to_change_password');
    }
  } catch (error) {
    console.error('Error changing password:', error);
    passwordUpdateError.value = t('message.unexpected_error_password');
  }
};

// Load user data on component mount
onMounted(async () => {
  if (!authStore.currentUser) {
    await authStore.fetchUser();
  }
  
  // Initialize email from store
  email.value = authStore.userEmail;
  originalEmail.value = authStore.userEmail;
});
</script>
