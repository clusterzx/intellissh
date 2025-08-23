<template>
  <div class="card hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1">
    <div class="card-header">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <h3 class="text-lg font-medium text-slate-900 dark:text-white truncate">
            {{ credential.name }}
          </h3>
        </div>
        <div class="relative">
          <button
            @click="toggleDropdown"
            class="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            data-dropdown-toggle
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
          <div
            v-if="dropdownOpen"
            class="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg z-10 border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in"
          >
            <div class="py-1">
              <button
                @click="editCredential"
                class="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                {{ $t('message.edit') }}
              </button>
              <hr class="my-1 border-slate-200 dark:border-slate-700" />
              <button
                @click="deleteCredential"
                class="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                {{ $t('message.delete') }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="mt-2 text-sm text-slate-500 dark:text-slate-400">
        <div class="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
          </svg>
          <span>{{ credential.username }}</span>
        </div>
        <div class="flex items-center mt-1">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
          </svg>
          <span>{{ credential.type === 'password' ? $t('message.password_type') : $t('message.private_key_type') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  credential: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['edit', 'delete']);

const { t } = useI18n();

const dropdownOpen = ref(false);

const toggleDropdown = (event) => {
  event.stopPropagation();
  dropdownOpen.value = !dropdownOpen.value;
};

const closeDropdown = () => {
  dropdownOpen.value = false;
};

const editCredential = () => {
  emit('edit', props.credential);
  closeDropdown();
};

const deleteCredential = () => {
  emit('delete', props.credential.id);
  closeDropdown();
};

// Click outside handler reference
const handleClickOutside = (event) => {
  // Don't close if clicking on the dropdown toggle button
  if (event.target.closest('[data-dropdown-toggle]')) {
    return;
  }
  closeDropdown();
};

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.card {
  @apply bg-white dark:bg-slate-800 rounded-xl shadow-soft p-6;
}

.card-header {
  @apply mb-4;
}

.card-footer {
  @apply mt-4;
}
</style>
