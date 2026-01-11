<template>
  <div class="fixed left-0 right-0 bottom-0 z-40 border-t border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
    <!-- Header / Tab Strip -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-700">
      <div class="flex items-center gap-2 min-w-0">
        <button
          type="button"
          class="btn-outline px-2 py-1 text-xs"
          @click="collapsed = !collapsed"
        >
          {{ collapsed ? $t('message.expand_workspace') : $t('message.collapse_workspace') }}
        </button>

        <div class="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
          {{ $t('message.terminal_workspace') }}
        </div>

        <div class="text-xs text-slate-500 dark:text-slate-400">
          ({{ terminalTabs.tabs.length }})
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="btn-outline px-2 py-1 text-xs"
          :disabled="!terminalTabs.hasTabs"
          @click="closeAll"
        >
          {{ $t('message.close_all') }}
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="px-2 py-2 overflow-x-auto">
      <div class="flex gap-2 min-w-max">
        <button
          v-for="sessionId in terminalTabs.tabs"
          :key="sessionId"
          type="button"
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm whitespace-nowrap"
          :class="sessionId === terminalTabs.activeSessionId
            ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-500'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700'"
          @click="terminalTabs.setActive(sessionId)"
          :title="tabTitle(sessionId)"
        >
          <span
            class="inline-block h-2.5 w-2.5 rounded-full"
            :class="statusDotClass(sessionId)"
          ></span>

          <span class="truncate max-w-[220px]">
            {{ tabLabel(sessionId) }}
          </span>

          <span class="text-xs text-slate-400 dark:text-slate-400" v-if="tabSubtitle(sessionId)">
            {{ tabSubtitle(sessionId) }}
          </span>

          <span
            class="ml-1 inline-flex items-center justify-center rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-600/60 p-1"
            @click.stop="terminalTabs.closeTab(sessionId)"
            :title="$t('message.close_tab')"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        </button>
      </div>
    </div>

    <!-- Terminal Panes -->
    <div v-show="!collapsed" class="h-[45vh] border-t border-slate-200 dark:border-slate-700">
      <div class="h-full">
        <TerminalPane
          v-for="sessionId in terminalTabs.tabs"
          :key="sessionId"
          :session-id="sessionId"
          :active="sessionId === terminalTabs.activeSessionId"
          class="h-full"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useTerminalTabsStore } from '@/stores/terminalTabsStore'
import TerminalPane from './TerminalPane.vue'

const terminalTabs = useTerminalTabsStore()
const collapsed = ref(false)

const closeAll = async () => {
  await terminalTabs.closeAll()
}

const tab = (sessionId) => terminalTabs.getTab(sessionId)

const tabLabel = (sessionId) => tab(sessionId)?.title || `Session ${sessionId}`
const tabSubtitle = (sessionId) => tab(sessionId)?.subtitle || ''
const tabTitle = (sessionId) => {
  const t = tab(sessionId)
  if (!t) return `Session ${sessionId}`
  return [t.title, t.subtitle].filter(Boolean).join(' • ')
}

const statusDotClass = (sessionId) => {
  const status = tab(sessionId)?.status
  if (status === 'connected') return 'bg-emerald-500'
  if (status === 'connecting') return 'bg-amber-500'
  if (status === 'error') return 'bg-red-500'
  return 'bg-slate-400'
}
</script>
