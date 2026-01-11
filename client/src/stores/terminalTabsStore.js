import { defineStore } from 'pinia'
import { reactive, computed } from 'vue'
import { io } from 'socket.io-client'
import { useAuthStore } from '@/stores/authStore'
import { useSessionStore } from '@/stores/sessionStore'

export const useTerminalTabsStore = defineStore('terminalTabs', () => {
  // Ordered list of open session IDs (tabs)
  const tabs = reactive([])

  // Active tab
  const state = reactive({
    activeSessionId: null,
    tabMap: {} // sessionId -> tab object
  })

  const hasTabs = computed(() => tabs.length > 0)

  const getTab = (sessionId) => {
    const id = Number(sessionId)
    return state.tabMap[id] || null
  }

  const setActive = (sessionId) => {
    // "Home" tab (no active terminal)
    if (sessionId === null || sessionId === undefined || sessionId === 'home') {
      state.activeSessionId = null
      return
    }

    const id = Number(sessionId)
    if (!state.tabMap[id]) return
    state.activeSessionId = id
  }

  const _tabTitleSubtitleFromSession = (session) => {
    const title = session?.name || `Session ${session?.id ?? ''}`.trim()
    const subtitleParts = []
    if (session?.username && session?.hostname) subtitleParts.push(`${session.username}@${session.hostname}`)
    if (session?.port) subtitleParts.push(`:${session.port}`)
    const subtitle = subtitleParts.join('') || ''
    return { title, subtitle }
  }

  const _ensureTab = async (sessionOrId) => {
    const sessionId = Number(sessionOrId?.id ?? sessionOrId)
    if (!sessionId) throw new Error('Invalid session id')

    if (state.tabMap[sessionId]) return state.tabMap[sessionId]

    // try to get full session metadata for nicer labels
    const sessionStore = useSessionStore()
    const s = sessionOrId?.id
      ? sessionOrId
      : (sessionStore.allSessions || []).find(x => Number(x.id) === sessionId)

    const { title, subtitle } = _tabTitleSubtitleFromSession(s || { id: sessionId })

    state.tabMap[sessionId] = reactive({
      sessionId,
      title,
      subtitle,
      status: 'connecting', // connecting | connected | error | disconnected
      error: '',
      socket: null,
      terminal: null,
      outputBuffer: ''
    })

    tabs.push(sessionId)
    if (!state.activeSessionId) state.activeSessionId = sessionId
    return state.tabMap[sessionId]
  }

  const _authenticateSocket = (socket) => {
    const auth = useAuthStore()
    if (!auth?.token) return Promise.reject(new Error('No auth token'))

    return new Promise((resolve, reject) => {
      const onAuthed = () => { cleanup(); resolve() }
      const onErr = (err) => { cleanup(); reject(new Error(err?.message || 'Auth failed')) }

      const cleanup = () => {
        socket.off('authenticated', onAuthed)
        socket.off('auth-error', onErr)
      }

      socket.on('authenticated', onAuthed)
      socket.on('auth-error', onErr)

      socket.emit('authenticate', { token: auth.token })
      setTimeout(() => {
        cleanup()
        reject(new Error('Auth timeout'))
      }, 15000)
    })
  }

  const _attachSocketListeners = (tab) => {
    const socket = tab.socket
    if (!socket) return

    socket.on('terminal-output', (data) => {
      const chunk = data || ''
      tab.outputBuffer += chunk

      // prevent runaway memory
      if (tab.outputBuffer.length > 2_000_000) {
        tab.outputBuffer = tab.outputBuffer.slice(-1_000_000)
      }

      if (tab.terminal?.write) tab.terminal.write(chunk)
    })

    socket.on('terminal-error', (err) => {
      tab.status = 'error'
      tab.error = err?.message || 'Terminal error'
    })

    socket.on('terminal-disconnected', () => {
      tab.status = 'disconnected'
      tab.error = ''
    })

    socket.on('disconnect', () => {
      // do not remove tab; keep it visible for retry
      if (tab.status === 'connected') tab.status = 'disconnected'
    })
  }

  const _connectTab = async (tab) => {
    // Close any previous socket to avoid “client namespace disconnect” loops
    try { tab.socket?.close?.() } catch {}
    tab.socket = null

    tab.status = 'connecting'
    tab.error = ''

    const socket = io('/', { transports: ['websocket', 'polling'] })
    tab.socket = socket

    await new Promise((resolve, reject) => {
      const onConnect = () => { cleanup(); resolve() }
      const onErr = (e) => { cleanup(); reject(e) }
      const cleanup = () => {
        socket.off('connect', onConnect)
        socket.off('connect_error', onErr)
      }

      socket.on('connect', onConnect)
      socket.on('connect_error', onErr)

      setTimeout(() => {
        cleanup()
        reject(new Error('Socket connect timeout'))
      }, 15000)
    })

    await _authenticateSocket(socket)
    _attachSocketListeners(tab)

    await new Promise((resolve, reject) => {
      const onEstablished = () => { cleanup(); resolve() }
      const onError = (err) => { cleanup(); reject(new Error(err?.message || 'Connect session failed')) }

      const cleanup = () => {
        socket.off('connection-established', onEstablished)
        socket.off('connection-error', onError)
      }

      socket.on('connection-established', onEstablished)
      socket.on('connection-error', onError)

      socket.emit('connect-session', { sessionId: tab.sessionId })

      setTimeout(() => {
        cleanup()
        reject(new Error('SSH connect timeout'))
      }, 30000)
    })

    tab.status = 'connected'
    tab.error = ''
  }

  /**
   * Open a tab. Accepts:
   * - openTab(sessionObject)
   * - openTab(sessionId)
   */
  const openTab = async (sessionOrId) => {
    const tab = await _ensureTab(sessionOrId)

    // focus
    state.activeSessionId = tab.sessionId

    // connect if needed
    if (!tab.socket || tab.status !== 'connected') {
      try {
        await _connectTab(tab)
      } catch (e) {
        tab.status = 'error'
        tab.error = e?.message || String(e)
        throw e
      }
    }

    return tab
  }

  const reconnect = async (sessionOrId) => {
    const tab = await _ensureTab(sessionOrId)

    // refresh labels if session object provided
    if (sessionOrId && typeof sessionOrId === 'object') {
      const { title, subtitle } = _tabTitleSubtitleFromSession(sessionOrId)
      tab.title = title
      tab.subtitle = subtitle
    }

    try {
      await _connectTab(tab)
    } catch (e) {
      tab.status = 'error'
      tab.error = e?.message || String(e)
      throw e
    }
  }

  const attachTerminal = (sessionId, terminal) => {
    const tab = getTab(sessionId)
    if (!tab) return
    tab.terminal = terminal

    // Flush buffer into xterm (if any)
    if (tab.outputBuffer && terminal?.write) {
      terminal.write(tab.outputBuffer)
    }
  }

  const detachTerminal = (sessionId) => {
    const tab = getTab(sessionId)
    if (!tab) return
    tab.terminal = null
  }

  const sendInput = (sessionId, data) => {
    const tab = getTab(sessionId)
    if (!tab?.socket?.connected) return
    tab.socket.emit('terminal-input', data)
  }

  const resize = (sessionId, size) => {
    const tab = getTab(sessionId)
    if (!tab?.socket?.connected) return
    tab.socket.emit('terminal-resize', size)
  }

  const closeTab = async (sessionId) => {
    const id = Number(sessionId)
    const tab = state.tabMap[id]
    if (!tab) return

    try {
      tab.socket?.emit?.('disconnect-session')
    } catch {}

    try {
      tab.socket?.close?.()
    } catch {}

    tab.socket = null
    tab.terminal = null
    tab.status = 'disconnected'
    tab.error = ''

    // remove from tabs list + map
    const idx = tabs.findIndex(x => Number(x) === id)
    if (idx >= 0) tabs.splice(idx, 1)
    delete state.tabMap[id]

    // fix active pointer
    if (state.activeSessionId === id) {
      state.activeSessionId = tabs.length ? tabs[tabs.length - 1] : null
    }
  }

  const closeAll = async () => {
    const ids = [...tabs]
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      await closeTab(id)
    }
  }

  return {
    // state
    tabs,
    hasTabs,
    activeSessionId: computed(() => state.activeSessionId),

    // actions
    getTab,
    setActive,
    openTab,
    reconnect,
    attachTerminal,
    detachTerminal,
    sendInput,
    resize,
    closeTab,
    closeAll
  }
})
