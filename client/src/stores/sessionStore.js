import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

export const useSessionStore = defineStore('session', () => {
  // State
  const sessions = ref([])
  const currentSession = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const normalizeSession = (session) => {
    if (!session || typeof session !== 'object') {
      return null
    }

    const {
      credential_id,
      credentialId,
      tags,
      ...rest
    } = session

    const normalizedTags = Array.isArray(tags)
      ? tags.map(tag => ({
          id: tag.id,
          name: tag.name,
          created_at: tag.created_at,
          updated_at: tag.updated_at
        }))
      : []

    return {
      ...rest,
      credentialId: credentialId ?? credential_id ?? null,
      tags: normalizedTags
    }
  }

  // Getters
  const allSessions = computed(() => sessions.value)
  const isLoading = computed(() => loading.value)
  const sessionError = computed(() => error.value)
  const sessionCount = computed(() => sessions.value.length)

  // Actions
  const fetchSessions = async () => {
    // console.log('fetchSessions: Starting...')
    loading.value = true
    error.value = null

    try {
      const response = await axios.get('/api/sessions')
      const sessionPayload = Array.isArray(response.data?.sessions) ? response.data.sessions : []
      sessions.value = sessionPayload
        .map(normalizeSession)
        .filter(Boolean)
      // console.log('fetchSessions: Successfully fetched sessions.')
      return { success: true }
    } catch (err) {
      // console.error('fetchSessions: Error fetching sessions:', err)
      error.value = err.response?.data?.error || 'Failed to fetch sessions'
      return { success: false, error: error.value }
    } finally {
      // console.log('fetchSessions: Finally block - setting loading to false.')
      loading.value = false
    }
  }

  const getSession = async (sessionId) => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.get(`/api/sessions/${sessionId}`)
      const normalizedSession = normalizeSession(response.data.session)
      currentSession.value = normalizedSession
      return { success: true, session: normalizedSession }
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to fetch session'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  const createSession = async (sessionData) => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.post('/api/sessions', sessionData)
      const newSession = normalizeSession(response.data.session)

      if (newSession) {
        sessions.value.unshift(newSession)
      }
      
      return { success: true, session: newSession }
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to create session'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  const updateSession = async (sessionId, sessionData) => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.put(`/api/sessions/${sessionId}`, sessionData)
      const updatedSession = normalizeSession(response.data.session)

      if (updatedSession) {
        const index = sessions.value.findIndex(s => s.id === sessionId)
        if (index !== -1) {
          sessions.value[index] = updatedSession
        }

        if (currentSession.value?.id === sessionId) {
          currentSession.value = updatedSession
        }
      }
      
      return { success: true, session: updatedSession }
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to update session'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  const deleteSession = async (sessionId) => {
    loading.value = true
    error.value = null

    try {
      await axios.delete(`/api/sessions/${sessionId}`)
      
      // Remove from local sessions array
      sessions.value = sessions.value.filter(s => s.id !== sessionId)
      
      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to delete session'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  const duplicateSession = async (sessionId, newName) => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.post(`/api/sessions/${sessionId}/duplicate`, {
        name: newName
      })
      const duplicatedSession = normalizeSession(response.data.session)
      
      if (duplicatedSession) {
        sessions.value.unshift(duplicatedSession)
      }
      
      return { success: true, session: duplicatedSession }
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to duplicate session'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  const testConnection = async (sessionId) => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.post(`/api/sessions/${sessionId}/test`)
      return { success: true, result: response.data }
    } catch (err) {
      error.value = err.response?.data?.error || 'Connection test failed'
      return { 
        success: false, 
        error: error.value,
        details: err.response?.data?.details
      }
    } finally {
      loading.value = false
    }
  }

  const saveConsoleSnapshot = async (sessionId, snapshotData) => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.post(`/api/sessions/${sessionId}/snapshot`, {
        snapshot: snapshotData
      })
      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to save console snapshot'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  const getSessionStats = async () => {
    try {
      const response = await axios.get('/api/sessions/stats/connections')
      return { success: true, stats: response.data.stats }
    } catch (err) {
      console.error('Failed to fetch session stats:', err)
      return { success: false }
    }
  }

  const findSessionById = (sessionId) => {
    return sessions.value.find(s => s.id === parseInt(sessionId))
  }

  const getRecentSessions = (limit = 5) => {
    return sessions.value
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, limit)
  }

  const searchSessions = (query) => {
    if (!query) return sessions.value
    
    const searchTerm = query.toLowerCase()
    return sessions.value.filter(session => {
      const matchesField = [session.name, session.hostname, session.username]
        .filter(Boolean)
        .some(field => field.toLowerCase().includes(searchTerm))

      const matchesTag = Array.isArray(session.tags)
        ? session.tags.some(tag => tag.name?.toLowerCase().includes(searchTerm))
        : false

      return matchesField || matchesTag
    })
  }

  const clearError = () => {
    error.value = null
  }

  const clearCurrentSession = () => {
    currentSession.value = null
  }

  const setCurrentSession = (session) => {
    currentSession.value = session
  }

  const removeTagFromSessions = (tagId) => {
    if (!tagId) return

    sessions.value = sessions.value.map(session => {
      if (!Array.isArray(session.tags) || session.tags.length === 0) {
        return session
      }

      const filteredTags = session.tags.filter(tag => tag.id !== tagId)
      if (filteredTags.length === session.tags.length) {
        return session
      }

      return {
        ...session,
        tags: filteredTags
      }
    })

    if (currentSession.value?.tags) {
      currentSession.value = {
        ...currentSession.value,
        tags: currentSession.value.tags.filter(tag => tag.id !== tagId)
      }
    }
  }

  const renameTagInSessions = (tagId, newName) => {
    if (!tagId || !newName) return

    sessions.value = sessions.value.map(session => {
      if (!Array.isArray(session.tags) || session.tags.length === 0) {
        return session
      }

      let hasChanges = false
      const updatedTags = session.tags.map(tag => {
        if (tag.id === tagId) {
          hasChanges = true
          return {
            ...tag,
            name: newName
          }
        }
        return tag
      })

      return hasChanges ? { ...session, tags: updatedTags } : session
    })

    if (currentSession.value?.tags?.length) {
      currentSession.value = {
        ...currentSession.value,
        tags: currentSession.value.tags.map(tag => tag.id === tagId ? { ...tag, name: newName } : tag)
      }
    }
  }

  // Validation helpers
  const validateSessionData = (sessionData) => {
    const errors = []

    if (!sessionData.name?.trim()) {
      errors.push('Session name is required')
    }

    if (!sessionData.hostname?.trim()) {
      errors.push('Hostname is required')
    }

    if (!sessionData.username?.trim()) {
      errors.push('Username is required')
    }

    if (sessionData.port && (isNaN(sessionData.port) || sessionData.port < 1 || sessionData.port > 65535)) {
      errors.push('Port must be a valid number between 1 and 65535')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Utility to forcibly clear loading state
  const clearLoadingState = () => {
    loading.value = false
  }

  return {
    // State
    sessions,
    currentSession,
    loading,
    error,
    
    // Getters
    allSessions,
    isLoading,
    sessionError,
    sessionCount,
    
    // Actions
    fetchSessions,
    getSession,
    createSession,
    updateSession,
    deleteSession,
    duplicateSession,
    testConnection,
    saveConsoleSnapshot,
    getSessionStats,
    findSessionById,
    getRecentSessions,
    searchSessions,
    clearError,
    clearCurrentSession,
    setCurrentSession,
    removeTagFromSessions,
    renameTagInSessions,
    validateSessionData,
    clearLoadingState
  }
})
