<template>
  <button 
    @click="toggleDarkMode" 
    class="dark-mode-toggle bg-slate-200 dark:bg-slate-700"
    aria-label="Toggle dark mode"
  >
    <!-- Sun icon (visible in dark mode) -->
    <svg
      v-show="isDarkMode"
      xmlns="http://www.w3.org/2000/svg"
      class="dark-mode-toggle__icon dark-mode-toggle__icon--sun h-3.5 w-3.5"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fill-rule="evenodd"
        d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
        clip-rule="evenodd"
      />
    </svg>
    
    <!-- Moon icon (visible in light mode) -->
    <svg
      v-show="!isDarkMode"
      xmlns="http://www.w3.org/2000/svg"
      class="dark-mode-toggle__icon dark-mode-toggle__icon--moon h-3.5 w-3.5"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
    </svg>
    
    <span 
      class="dark-mode-toggle__handle" 
      :class="isDarkMode ? 'dark-mode-toggle__handle--day' : 'dark-mode-toggle__handle--night'"
    ></span>
  </button>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

// State
const isDarkMode = ref(false);

// Methods
const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value;
  updateDarkMode();
};

const updateDarkMode = () => {
  // Apply or remove dark class on html element
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  
  // Save preference to localStorage
  localStorage.setItem('darkMode', isDarkMode.value ? 'dark' : 'light');
};

// Initialize dark mode based on saved preference or system preference
const initDarkMode = () => {
  // Check for saved preference
  const savedMode = localStorage.getItem('darkMode');
  
  if (savedMode) {
    isDarkMode.value = savedMode === 'dark';
  } else {
    // Check system preference
    isDarkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  
  // Apply initial setting
  updateDarkMode();
  
  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    if (!localStorage.getItem('darkMode')) {
      isDarkMode.value = event.matches;
      updateDarkMode();
    }
  });
};

// Lifecycle
onMounted(() => {
  initDarkMode();
});
</script>
