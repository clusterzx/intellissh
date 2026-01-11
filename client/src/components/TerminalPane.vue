<template>
  <div class="h-full w-full" v-show="active">
    <div class="h-full w-full relative">
      <div ref="terminalEl" class="absolute inset-0"></div>

      <!-- Status overlay -->
      <div
        v-if="tabStatus !== 'connected'"
        class="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
      >
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-lg w-full max-w-lg mx-4 border border-slate-200 dark:border-slate-700">
          <div class="p-4">
            <div class="flex items-center justify-between mb-2">
              <div class="text-base font-semibold text-slate-900 dark:text-white">
                {{ tabTitle }}
              </div>
              <span class="text-xs px-2 py-1 rounded-full" :class="badgeClass">
                {{ statusLabel }}
              </span>
            </div>

            <div class="text-sm text-slate-600 dark:text-slate-300">
              <div v-if="tabSubtitle" class="truncate">{{ tabSubtitle }}</div>
              <div v-if="tabError" class="mt-2 text-red-600 dark:text-red-300">
                {{ tabError }}
              </div>
              <div v-else class="mt-2">
                {{ tabStatus === 'connecting' ? 'Opening SSH connection…' : 'Connection is not active.' }}
              </div>
            </div>

            <div class="mt-4 flex items-center justify-end gap-2">
              <button type="button" class="btn-outline px-3 py-2" @click="close">
                {{ $t('message.close_tab') }}
              </button>
              <button type="button" class="btn-primary px-3 py-2" @click="retry">
                {{ $t('message.retry') }}
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import html2canvas from 'html2canvas'
import { useTerminalTabsStore } from '@/stores/terminalTabsStore'
import { useSessionStore } from '@/stores/sessionStore'

const props = defineProps({
  sessionId: { type: Number, required: true },
  active: { type: Boolean, default: false }
})

const terminalTabs = useTerminalTabsStore()
const sessionStore = useSessionStore()

const terminalEl = ref(null)
let term = null
let fitAddon = null
let resizeObserver = null

const scheduleFit = () => {
  if (!props.active) return
  if (!term || !fitAddon) return

  // Run after layout settles. This avoids the "blank terminal" issue when the
  // terminal is opened while its container still has 0 height/width.
  requestAnimationFrame(() => {
    try {
      fitAddon.fit()
      terminalTabs.resize(props.sessionId, { cols: term.cols, rows: term.rows })
    } catch (e) {}
  })
}

const tab = computed(() => terminalTabs.getTab(props.sessionId))
const tabTitle = computed(() => tab.value?.title || `Session ${props.sessionId}`)
const tabSubtitle = computed(() => tab.value?.subtitle || '')
const tabStatus = computed(() => tab.value?.status || 'connecting')
const tabError = computed(() => tab.value?.error || '')

const badgeClass = computed(() => {
  const s = tabStatus.value
  if (s === 'connected') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
  if (s === 'connecting') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200'
  if (s === 'error') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200'
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
})

const statusLabel = computed(() => {
  const s = tabStatus.value
  if (s === 'connected') return 'Connected'
  if (s === 'connecting') return 'Connecting'
  if (s === 'error') return 'Error'
  return 'Disconnected'
})

const initTerminal = async () => {
  if (!terminalEl.value) return
  if (term) return

  term = new Terminal({
    cursorBlink: true,
    // Keep parity with the original (pre-tabs) TerminalView sizing so the
    // connection tab renders with the same readability.
    fontSize: 15,
    fontFamily: 'JetBrains Mono, Consolas, Monaco, "Courier New", monospace',
    lineHeight: 1.2,
    convertEol: true,
    scrollback: 5000
  })

  fitAddon = new FitAddon()
  term.loadAddon(fitAddon)
  term.loadAddon(new WebLinksAddon())

  term.open(terminalEl.value)

  // Attach to store so output buffering flushes
  terminalTabs.attachTerminal(props.sessionId, term)

  // Input -> server
  term.onData((data) => {
    terminalTabs.sendInput(props.sessionId, data)
  })

  // Initial fit + resize event
  await nextTick()
  fitAddon.fit()
  terminalTabs.resize(props.sessionId, { cols: term.cols, rows: term.rows })
}

const disposeTerminal = () => {
  try {
    terminalTabs.detachTerminal(props.sessionId)
  } catch (e) {}
  try {
    term?.dispose()
  } catch (e) {}
  term = null
  fitAddon = null
}

const handleWindowResize = () => {
  scheduleFit()
}

const retry = async () => {
  const s = sessionStore.allSessions?.find((x) => Number(x.id) === Number(props.sessionId))
  if (!s) {
    // If session not in store, at least try reconnect with minimal data
    await terminalTabs.reconnect({ id: props.sessionId, name: tabTitle.value })
    return
  }
  await terminalTabs.reconnect(s)
}

let snapshotBusy = false
let lastSnapshotMs = 0

const captureAndSaveSnapshot = async () => {
  // Keep the “Last Session” preview up to date (same purpose as TerminalView.vue
  // in the original archive, which captured a snapshot on disconnect).
  // With tabs, users often return to Home without explicitly disconnecting,
  // so we capture both on tab-close and when a tab becomes inactive.
  if (snapshotBusy) return
  const now = Date.now()
  if (now - lastSnapshotMs < 5000) return // simple throttle
  if (!terminalEl.value) return

  snapshotBusy = true
  try {
    const isDark = document.documentElement.classList.contains('dark')
    const canvas = await html2canvas(terminalEl.value, {
      backgroundColor: isDark ? '#0b1220' : '#0f172a',
      scale: 0.75,
      logging: false,
      useCORS: true
    })

    const snapshotData = canvas.toDataURL('image/jpeg', 0.7)
    if (snapshotData) {
      await sessionStore.saveConsoleSnapshot(props.sessionId, snapshotData)
      lastSnapshotMs = now
    }
  } catch (e) {
    // Never block UI actions on snapshot errors
    console.warn('Failed to capture/save terminal snapshot:', e)
  } finally {
    snapshotBusy = false
  }
}

const close = async () => {
  // Save a snapshot before closing (so the SSH Sessions preview updates)
  await captureAndSaveSnapshot()

  await terminalTabs.closeTab(props.sessionId)
}

onMounted(async () => {
  await initTerminal()
  window.addEventListener('resize', handleWindowResize)

  // Observe size changes to reliably fit when switching between Home and a tab,
  // or when parent flex layouts update.
  try {
    resizeObserver = new ResizeObserver(() => {
      scheduleFit()
    })
    if (terminalEl.value) {
      resizeObserver.observe(terminalEl.value)
    }
    if (terminalEl.value?.parentElement) {
      resizeObserver.observe(terminalEl.value.parentElement)
    }
  } catch (e) {
    resizeObserver = null
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleWindowResize)
  try {
    resizeObserver?.disconnect?.()
  } catch (e) {}
  resizeObserver = null
  disposeTerminal()
})

// When tab becomes active, fit terminal
watch(
  () => props.active,
  async (val, oldVal) => {
    // When switching away from a terminal tab (to Home or another tab), capture
    // a snapshot so the “Last Session” preview updates without requiring an
    // explicit disconnect.
    if (oldVal === true && val === false) {
      // Important: v-show will hide the element after render; capture before that.
      await captureAndSaveSnapshot()
      return
    }

    if (!val) return
    await nextTick()
    await initTerminal()
    scheduleFit()
  }
)

// Capture an initial snapshot shortly after a successful connection so newly
// created sessions get a preview even if the user never explicitly disconnects.
watch(
  () => tabStatus.value,
  (val, oldVal) => {
    if (val === 'connected' && oldVal !== 'connected') {
      setTimeout(() => {
        if (props.active) captureAndSaveSnapshot()
      }, 1200)
    }
  }
)
</script>

<style scoped>
/* Ensure xterm fills available space */
:deep(.xterm) {
  height: 100%;
}
:deep(.xterm-viewport) {
  height: 100% !important;
}
</style>