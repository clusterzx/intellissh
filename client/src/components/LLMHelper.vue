<template>
  <div class="flex flex-col h-full bg-white dark:bg-slate-800 transition-colors duration-200 overflow-hidden">
    <!-- Header -->
    <div class="p-3 border-b border-slate-200 dark:border-slate-700">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h3 class="text-lg font-medium text-slate-900 dark:text-slate-100">{{ $t('message.terminal_assistant') }}</h3>
          <!-- Loading spinner -->
          <div v-if="isProcessing" class="flex items-center text-indigo-600 dark:text-indigo-400">
            <svg class="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-xs">{{ $t('message.processing') }}</span>
          </div>
        </div>
        <div class="toggle-switch flex items-center">
          <label class="switch">
            <input type="checkbox" v-model="helperEnabled" @change="toggleHelper" :disabled="!isReady" />
            <span class="slider round" :class="{'bg-indigo-500 dark:bg-indigo-600': helperEnabled, 'bg-slate-300 dark:bg-slate-600': !helperEnabled || !isReady}"></span>
          </label>
          <span class="ml-2 text-sm text-slate-600 dark:text-slate-400">{{ helperEnabled ? $t('message.enabled') : $t('message.disabled') }}</span>
        </div>
      </div>
    </div>
    
    <!-- Command Approval Section -->
    <div v-if="pendingCommand" class="p-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800/50">
      <div class="flex items-start">
        <div class="flex-shrink-0 mt-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="ml-3 flex-1">
          <p class="text-sm font-medium text-amber-800 dark:text-amber-300">{{ $t('message.suggested_command') }}</p>
          <div class="mt-2 mb-3 bg-slate-800 dark:bg-slate-900 text-slate-100 dark:text-slate-200 rounded-lg overflow-hidden shadow-inner">
            <div class="p-3 text-xs font-mono overflow-auto max-h-40 custom-scrollbar">{{ pendingCommand.command }}</div>
          </div>
          <p class="text-sm text-slate-600 dark:text-slate-400 mb-3">{{ pendingCommand.reasoning }}</p>
          <div class="flex justify-end space-x-3">
            <button @click="rejectCommand" class="btn-ghost px-3 py-1.5 text-sm">
              {{ $t('message.reject') }}
            </button>
            <button @click="approveCommand" class="btn-primary px-3 py-1.5 text-sm flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              {{ $t('message.execute') }}
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="flex-grow flex flex-col p-3 overflow-hidden">
      <!-- Analyze Output Button -->
      <div v-if="helperEnabled && isReady && !isProcessing" class="mb-3">
        <button 
          @click="analyzeLastOutput" 
          class="w-full py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-800/30 text-indigo-700 dark:text-indigo-300 rounded-lg transition-colors flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          {{ $t('message.analyze_terminal_output') }}
        </button>
      </div>
      
      <!-- Chat history display -->
      <div v-if="history.length > 0" class="flex-grow overflow-y-auto mb-3 custom-scrollbar pr-1">
        <div 
          v-for="(item, index) in getUniqueHistory()" 
          :key="index" 
          class="mb-3 animate-fade-in"
        >
          <div class="flex items-center mb-1">
            <div class="timestamp text-xs text-slate-500 dark:text-slate-500">{{ formatTime(item.timestamp) }}</div>
          </div>
          
          <!-- Command executed -->
          <div v-if="item.type === 'command' || item.type === 'executed'" 
               class="ml-auto max-w-[85%] bg-indigo-500/10 dark:bg-indigo-500/20 rounded-2xl rounded-tr-sm p-3 border border-indigo-200 dark:border-indigo-800/50 shadow-sm">
            <div class="font-medium text-indigo-800 dark:text-indigo-300 text-sm mb-1">{{ $t('message.command_executed') }}</div>
            <code class="block text-xs bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded whitespace-pre-wrap break-all overflow-hidden text-slate-800 dark:text-slate-200">{{ item.content.command }}</code>
            <div class="mt-2 text-xs text-slate-600 dark:text-slate-400">{{ item.content.reasoning }}</div>
          </div>
          
          <!-- Command suggestion -->
          <div v-else-if="item.type === 'suggestion'"
               class="ml-auto max-w-[85%] bg-amber-500/10 dark:bg-amber-500/20 rounded-2xl rounded-tr-sm p-3 border border-amber-200 dark:border-amber-800/50 shadow-sm">
            <div class="font-medium text-amber-800 dark:text-amber-300 text-sm mb-1">{{ $t('message.suggestion') }}</div>
            <code class="block text-xs bg-amber-100 dark:bg-amber-900/50 p-2 rounded whitespace-pre-wrap break-all overflow-hidden text-slate-800 dark:text-slate-200">{{ item.content.command }}</code>
            <div class="mt-2 text-xs text-slate-600 dark:text-slate-400">{{ item.content.reasoning }}</div>
            <div class="flex justify-end mt-2 space-x-2">
              <button @click="rejectHistoryCommand(item)" class="px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                {{ $t('message.dismiss') }}
              </button>
              <button @click="approveHistoryCommand(item)" class="px-2 py-1 bg-amber-500/80 text-white text-xs rounded hover:bg-amber-600 transition-colors">
                {{ $t('message.execute') }}
              </button>
            </div>
          </div>
          
          <!-- Rejected command -->
          <div v-else-if="item.type === 'rejected'"
               class="mr-auto max-w-[85%] bg-slate-100 dark:bg-slate-700/50 rounded-2xl rounded-tl-sm p-3 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div class="font-medium text-red-700 dark:text-red-400 text-sm">{{ $t('message.command_rejected') }}</div>
          </div>
          
          <!-- Normal assistant response -->
          <div v-else class="mr-auto max-w-[85%] bg-slate-100 dark:bg-slate-700/50 rounded-2xl rounded-tl-sm p-3 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div class="text-sm text-slate-700 dark:text-slate-200">
              {{ item.content.message }}
            </div>
          </div>
        </div>
      </div>
      <div v-else class="flex-grow flex items-center justify-center">
        <div class="text-center text-slate-500 dark:text-slate-400 p-6">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-3 text-slate-400 dark:text-slate-500 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p class="text-sm">{{ $t('message.no_activity_yet') }}</p>
        </div>
      </div>
      
      <!-- Input area -->
      <div class="mt-3 bg-slate-100 dark:bg-slate-700/30 rounded-lg p-3 border border-slate-200 dark:border-slate-700/50">
        <textarea 
          v-model="manualPrompt" 
          placeholder="Ask the assistant for help or suggest a command..." 
          class="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all duration-200"
          :disabled="!helperEnabled || isProcessing || !isReady"
          rows="3"
        ></textarea>
        <div class="flex justify-between mt-2">
          <button 
            @click="clearHelperHistory" 
            class="btn-ghost px-3 py-1.5 text-sm"
            :disabled="history.length === 0"
            :class="{'opacity-50 cursor-not-allowed': history.length === 0}"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            Clear History
          </button>
          <button 
            @click="sendPrompt" 
            class="btn-primary px-4 py-1.5 text-sm"
            :disabled="!helperEnabled || !manualPrompt || isProcessing || !isReady"
          >
            <span v-if="isProcessing" class="flex items-center">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
            <span v-else class="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
              Send
            </span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Error display -->
    <div v-if="error" class="mx-3 mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg flex items-center shadow-sm">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      <div class="flex-1">{{ error }}</div>
      <button @click="clearError" class="ml-2 text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
    
    <!-- Terminal connection status -->
    <div v-if="!isReady" class="mx-3 mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-lg flex items-center shadow-sm">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
      </svg>
      <p>Connect to a terminal session to use the assistant</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useLLMHelperStore } from '../stores/llmHelperStore'
import { useTerminalStore } from '../stores/terminalStore'
import { useI18n } from 'vue-i18n'

const llmHelperStore = useLLMHelperStore()
const terminalStore = useTerminalStore()
const { t } = useI18n()

const manualPrompt = ref('')
const helperEnabled = computed({
  get: () => llmHelperStore.isEnabled,
  set: (value) => llmHelperStore.toggleHelper(value)
})
const isProcessing = computed(() => llmHelperStore.isProcessing)
const isReady = computed(() => llmHelperStore.isReady)
const history = computed(() => llmHelperStore.history)
const error = computed(() => llmHelperStore.error)
const pendingCommand = computed(() => llmHelperStore.pendingCommand)

const toggleHelper = async () => {
  await llmHelperStore.toggleHelper(helperEnabled.value)
}

const sendPrompt = async () => {
  if (manualPrompt.value.trim()) {
    const success = await llmHelperStore.sendManualPrompt(manualPrompt.value)
    if (success) {
      manualPrompt.value = ''
    }
  }
}

const clearHelperHistory = () => {
  llmHelperStore.clearHistory()
}

const clearError = () => {
  llmHelperStore.clearError()
}

const approveCommand = async () => {
  await llmHelperStore.approveCommand()
}

const rejectCommand = () => {
  llmHelperStore.rejectCommand()
}

const analyzeLastOutput = async () => {
  await llmHelperStore.analyzeLastTerminalOutput()
}

// For commands in history
const approveHistoryCommand = async (item) => {
  // Create a temporary pending command from history item and approve it
  const command = item.content.command;
  const reasoning = item.content.reasoning;
  
  // Set as current pending command manually and then approve it
  llmHelperStore.setPendingCommandFromHistory({
    command,
    reasoning
  });
  
  await llmHelperStore.approveCommand();
}

const rejectHistoryCommand = (item) => {
  // Just remove this suggestion from history
  llmHelperStore.removeHistoryItem(item);
}

// Prevents duplicate messages in history display by using a unique identifier for each message
const getUniqueHistory = () => {
  const uniqueItems = [];
  const uniqueContentMap = new Map();
  
  // Get items in reverse order (newest first)
  const reversedHistory = [...history.value].reverse();
  
  reversedHistory.forEach(item => {
    // Create a unique identifier based on message content and timestamp
    const contentKey = item.type + '-' + 
                      (item.type === 'response' ? item.content.message : 
                       item.type === 'command' || item.type === 'executed' || item.type === 'suggestion' ? item.content.command : 
                       JSON.stringify(item.content));
    
    // Only add if we haven't seen this content before
    if (!uniqueContentMap.has(contentKey)) {
      uniqueContentMap.set(contentKey, true);
      uniqueItems.push(item);
    }
  });
  
  return uniqueItems;
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

onMounted(() => {
  llmHelperStore.setupSocketListeners()
  if (terminalStore.hasActiveSession) {
    llmHelperStore.fetchSettings()
  }
})

watch(() => terminalStore.hasActiveSession, (hasSession) => {
  if (hasSession) {
    llmHelperStore.fetchSettings()
  } else {
    llmHelperStore.toggleHelper(false)
  }
})
</script>

<style scoped>
/* Toggle switch styles */
.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: .4s;
}

input:checked + .slider {
  @apply bg-indigo-500 dark:bg-indigo-600;
}

input:disabled + .slider {
  @apply bg-slate-300 dark:bg-slate-600;
  cursor: not-allowed;
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.slider.round {
  border-radius: 20px;
}

.slider.round:before {
  border-radius: 50%;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.history-container {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.history-container::-webkit-scrollbar {
  width: 8px;
}

.history-container::-webkit-scrollbar-track {
  background: transparent;
}

.history-container::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 20px;
}

.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-slate-400 dark:bg-slate-600 rounded-full hover:bg-slate-500 dark:hover:bg-slate-500;
}
</style>
