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

    <!-- Two-Factor Authentication Section -->
    <div class="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 mt-6">
      <h2 class="text-xl font-semibold text-slate-900 dark:text-white mb-4">{{ $t('message.two_factor_authentication') }}</h2>
      
      <div class="mb-4">
        <p class="text-slate-700 dark:text-slate-300">
          {{ $t('message.status') }} 
          <span :class="authStore.currentUser?.is2faEnabled ? 'text-green-600' : 'text-red-600'">
            {{ authStore.currentUser?.is2faEnabled ? $t('message.enabled') : $t('message.disabled') }}
          </span>
        </p>
      </div>

      <div v-if="!authStore.currentUser?.is2faEnabled">
        <h3 class="text-lg font-medium text-slate-900 dark:text-white mb-3">{{ $t('message.enable_2fa') }}</h3>
        <p class="text-slate-600 dark:text-slate-400 mb-4">
          {{ $t('message.enable_2fa_description') }}
        </p>

        <div class="flex flex-col items-center mb-6">
          <button
            @click="generate2faSecret"
            :disabled="authStore.loading"
            class="btn-primary px-4 py-2 mb-4"
          >
            <span v-if="authStore.loading" class="spinner mr-2"></span>
            {{ $t('message.generate_new_secret') }}
          </button>

          <div v-if="authStore.getOtpauthUrl" class="border p-4 rounded-lg bg-slate-50 dark:bg-slate-700">
            <p class="text-center text-sm text-slate-600 dark:text-slate-400 mb-2">{{ $t('message.scan_qr_code') }}</p>
            <qrcode-vue :value="authStore.getOtpauthUrl" :size="200" level="H" class="mx-auto mb-4"></qrcode-vue>
            <p class="text-center text-sm font-mono text-slate-800 dark:text-slate-200 break-all">{{ authStore.getTotpSecret }}</p>
          </div>
        </div>

        <div class="mb-4">
          <label for="totpCodeEnable" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ $t('message.6_digit_code') }}</label>
          <input
            id="totpCodeEnable"
            v-model="totpCodeInput"
            type="text"
            :placeholder="$t('message.enter_6_digit_code')"
            class="form-input w-full"
          />
        </div>

        <button
          @click="enable2fa"
          :disabled="authStore.loading || !totpCodeInput || !authStore.getTotpSecret"
          class="btn-primary px-4 py-2"
        >
          <span v-if="authStore.loading" class="spinner mr-2"></span>
          {{ $t('message.enable_2fa') }}
        </button>
      </div>

      <div v-else>
        <h3 class="text-lg font-medium text-slate-900 dark:text-white mb-3">{{ $t('message.disable_2fa') }}</h3>
        <p class="text-slate-600 dark:text-slate-400 mb-4">
          {{ $t('message.disable_2fa_description') }}
        </p>

        <div class="mb-4">
          <label for="totpCodeDisable" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ $t('message.6_digit_code') }}</label>
          <input
            id="totpCodeDisable"
            v-model="totpCodeInput"
            type="text"
            :placeholder="$t('message.enter_6_digit_code')"
            class="form-input w-full"
          />
        </div>

        <button
          @click="disable2fa"
          :disabled="authStore.loading || !totpCodeInput"
          class="btn-danger px-4 py-2"
        >
          <span v-if="authStore.loading" class="spinner mr-2"></span>
          {{ $t('message.disable_2fa') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { useI18n } from 'vue-i18n';
import QrcodeVue from 'qrcode.vue';

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

// 2FA
const totpCodeInput = ref('');
const showQrCode = ref(false);

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

// 2FA Methods
const generate2faSecret = async () => {
  try {
    await authStore.generate2faSecret();
    showQrCode.value = true;
  } catch (error) {
    console.error(t('message.failed_to_generate_2fa_secret'), error);
    alert(t('message.error_generating_2fa_secret') + (error.message || 'Unknown error'));
  }
};

const enable2fa = async () => {
  if (!totpCodeInput.value) {
    alert(t('message.please_enter_6_digit_code'));
    return;
  }
  if (!authStore.getTotpSecret) {
    alert(t('message.please_generate_secret_first'));
    return;
  }
  try {
    const result = await authStore.enable2fa(totpCodeInput.value, authStore.getTotpSecret);
    if (result.success) {
      alert(t('message.2fa_enabled_successfully'));
      reset2faForm();
    } else {
      alert(t('message.failed_to_enable_2fa') + (result.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Failed to enable 2FA:', error);
    alert(t('message.failed_to_enable_2fa') + (error.message || 'Unknown error'));
  }
};

const disable2fa = async () => {
  if (!totpCodeInput.value) {
    alert(t('message.please_enter_6_digit_code'));
    return;
  }
  try {
    const result = await authStore.disable2fa(totpCodeInput.value);
    if (result.success) {
      alert(t('message.2fa_disabled_successfully'));
      reset2faForm();
    } else {
      alert(t('message.failed_to_disable_2fa') + (result.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Failed to disable 2FA:', error);
    alert(t('message.failed_to_disable_2fa') + (error.message || 'Unknown error'));
  }
};

const reset2faForm = () => {
  totpCodeInput.value = '';
  showQrCode.value = false;
  authStore.totpSecret = null;
  authStore.otpauthUrl = null;
};

// Load user data on component mount
onMounted(async () => {
  if (!authStore.currentUser) {
    await authStore.fetchUser();
  }
  
  // Initialize email from store
  email.value = authStore.userEmail;
  originalEmail.value = authStore.userEmail;
  reset2faForm();
});
</script>
