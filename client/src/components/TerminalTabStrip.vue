<template>
  <div class="terminal-tabstrip" role="tablist" aria-label="Terminal Tabs">
    <div class="terminal-tabstrip-inner">
      <!-- Home tab (Sessions) -->
      <button
        type="button"
        class="ttab"
        :class="homeActive ? 'ttab--active' : 'ttab--inactive'"
        role="tab"
        :aria-selected="homeActive ? 'true' : 'false'"
        @click="activateHome"
        :title="$t('message.ssh_sessions')"
      >
        <span class="ttab__icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
            <path d="M6 7h8v2H6V7zM6 11h8v2H6v-2z" fill="#000" opacity="0.15" />
          </svg>
        </span>
        <span class="ttab__label">{{ $t('message.ssh_sessions') }}</span>
      </button>

      <!-- Terminal tabs -->
      <button
        v-for="sessionId in terminalTabs.tabs"
        :key="sessionId"
        type="button"
        class="ttab"
        :class="sessionId === terminalTabs.activeSessionId ? 'ttab--active' : 'ttab--inactive'"
        role="tab"
        :aria-selected="sessionId === terminalTabs.activeSessionId ? 'true' : 'false'"
        @click="activateSession(sessionId)"
        :title="tabTitle(sessionId)"
      >
        <span class="ttab__dot" :class="statusDotClass(sessionId)" aria-hidden="true"></span>
        <span class="ttab__label">{{ tabLabel(sessionId) }}</span>
        <span
          class="ttab__close"
          role="button"
          tabindex="-1"
          @click.stop="close(sessionId)"
          :title="$t('message.close_tab')"
          aria-label="Close"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTerminalTabsStore } from '@/stores/terminalTabsStore'

const router = useRouter()
const route = useRoute()
const terminalTabs = useTerminalTabsStore()

const homeActive = computed(() => terminalTabs.activeSessionId === null)

const tab = (sessionId) => terminalTabs.getTab(sessionId)
const tabLabel = (sessionId) => tab(sessionId)?.title || `Session ${sessionId}`
const tabTitle = (sessionId) => {
  const t = tab(sessionId)
  if (!t) return `Session ${sessionId}`
  return [t.title, t.subtitle].filter(Boolean).join(' • ')
}

const statusDotClass = (sessionId) => {
  const status = tab(sessionId)?.status
  if (status === 'connected') return 'ttab__dot--connected'
  if (status === 'connecting') return 'ttab__dot--connecting'
  if (status === 'error') return 'ttab__dot--error'
  return 'ttab__dot--disconnected'
}

const ensureHomeRoute = async () => {
  // Terminal panes render inside HomeView. When user clicks a tab from
  // another route (e.g., Settings), we route back to Home first.
  if (route.name !== 'home') {
    await router.push({ name: 'home' })
  }
}

const activateHome = async () => {
  terminalTabs.setActive(null)
  await ensureHomeRoute()
}

const activateSession = async (sessionId) => {
  terminalTabs.setActive(sessionId)
  await ensureHomeRoute()
}

const close = async (sessionId) => {
  await terminalTabs.closeTab(sessionId)
  // If no tabs left, go home view
  if (terminalTabs.tabs.length === 0) {
    terminalTabs.setActive(null)
    await ensureHomeRoute()
  }
}
</script>

<style scoped>
.terminal-tabstrip {
  /* Chrome-like strip background */
  @apply border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900;
}

.terminal-tabstrip-inner {
  @apply flex items-end gap-1 px-2 py-2 overflow-x-auto;
  scrollbar-width: none;
}

.terminal-tabstrip-inner::-webkit-scrollbar {
  display: none;
}

.ttab {
  @apply relative flex items-center gap-2 pl-3 pr-2 h-9 max-w-[240px]
    rounded-t-xl border border-slate-200 dark:border-slate-700
    text-sm text-slate-700 dark:text-slate-200 select-none;
  min-width: 140px;
}

.ttab--inactive {
  @apply bg-slate-200/70 dark:bg-slate-800/70 hover:bg-slate-200 dark:hover:bg-slate-800;
}

.ttab--active {
  @apply bg-white dark:bg-slate-800 border-b-transparent shadow-sm;
}

.ttab__icon {
  @apply text-slate-600 dark:text-slate-300;
}

.ttab__label {
  @apply truncate;
}

.ttab__dot {
  @apply inline-block h-2.5 w-2.5 rounded-full;
}

.ttab__dot--connected { @apply bg-emerald-500; }
.ttab__dot--connecting { @apply bg-amber-500; }
.ttab__dot--error { @apply bg-red-500; }
.ttab__dot--disconnected { @apply bg-slate-400; }

.ttab__close {
  @apply ml-auto inline-flex items-center justify-center rounded-md p-1
    text-slate-500 hover:text-slate-900 hover:bg-slate-200/70
    dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700/70;
}
</style>
