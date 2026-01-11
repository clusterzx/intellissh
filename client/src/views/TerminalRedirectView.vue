<template>
  <div class="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-6 mx-4 max-w-md w-full">
      <div class="flex items-center">
        <div class="spinner mr-3"></div>
        <div class="text-sm text-slate-600 dark:text-slate-300">
          {{ $t('message.connecting') }}
        </div>
      </div>
      <div class="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Redirecting to workspace…
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTerminalTabsStore } from '@/stores/terminalTabsStore'
import { useSessionStore } from '@/stores/sessionStore'

const router = useRouter()
const route = useRoute()
const terminalTabs = useTerminalTabsStore()
const sessionStore = useSessionStore()

onMounted(async () => {
  const sessionId = route.params?.sessionId ? Number(route.params.sessionId) : null

  try {
    // Ensure session metadata is present for nicer labels when direct-linking.
    if (!sessionStore.allSessions || sessionStore.allSessions.length === 0) {
      await sessionStore.fetchSessions()
    }

    if (sessionId) {
      await terminalTabs.openTab(sessionId)
      terminalTabs.setActive(sessionId)
    } else {
      terminalTabs.setActive(null)
    }
  } catch (e) {
    // Keep going; HomeView will show error state for the tab if needed.
  } finally {
    router.replace({ name: 'home' })
  }
})
</script>