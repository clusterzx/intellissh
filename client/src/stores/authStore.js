import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const token = ref(localStorage.getItem('token'))
  const loading = ref(false)
  const error = ref(null)
  const requires2fa = ref(false)
  const tempUserFor2fa = ref(null)
  const totpSecret = ref(null)
  const otpauthUrl = ref(null)

  // Configure axios defaults
  if (token.value) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
  }

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isLoading = computed(() => loading.value)
  const currentUser = computed(() => user.value)
  const authError = computed(() => error.value)
  const userEmail = computed(() => user.value?.email || '')
  const getRequires2fa = computed(() => requires2fa.value)
  const getTempUserFor2fa = computed(() => tempUserFor2fa.value)
  const getTotpSecret = computed(() => totpSecret.value)
  const getOtpauthUrl = computed(() => otpauthUrl.value)

  // Actions
  const login = async (credentials) => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.post('/api/auth/login', credentials)
      const { token: authToken, user: userData, requires2fa: is2faRequired } = response.data

      if (is2faRequired) {
        requires2fa.value = true
        tempUserFor2fa.value = userData
        return { success: true, requires2fa: true }
      }

      // Store token and user data
      token.value = authToken
      user.value = userData
      
      // Set token in localStorage and axios headers
      localStorage.setItem('token', authToken)
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`

      return { success: true, requires2fa: false }
    } catch (err) {
      error.value = err.response?.data?.error || 'Login failed'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  const loginWith2fa = async (userId, totpCode) => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.post('/api/auth/2fa/login', { userId, totpCode })
      const { token: authToken, user: userData } = response.data

      token.value = authToken
      user.value = userData
      requires2fa.value = false // Reset 2FA requirement
      tempUserFor2fa.value = null
      
      localStorage.setItem('token', authToken)
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`

      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.error || '2FA login failed'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  const generate2faSecret = async () => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.post('/api/auth/2fa/generate-secret')
      totpSecret.value = response.data.secret
      otpauthUrl.value = response.data.otpauthUrl
      return { success: true, data: response.data }
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to generate 2FA secret'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  const verify2faCode = async (totpCode) => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.post('/api/auth/2fa/verify', { totpCode })
      return { success: true, data: response.data }
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to verify 2FA code'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  const enable2fa = async (totpCode, secret) => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.post('/api/auth/2fa/enable', { totpCode, secret })
      // After enabling, refresh user data to reflect 2FA status
      await fetchUser()
      return { success: true, data: response.data }
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to enable 2FA'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  const disable2fa = async (totpCode) => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.post('/api/auth/2fa/disable', { totpCode })
      // After disabling, refresh user data to reflect 2FA status
      await fetchUser()
      return { success: true, data: response.data }
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to disable 2FA'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  const register = async (userData) => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.post('/api/auth/register', userData)
      return { success: true, data: response.data }
    } catch (err) {
      error.value = err.response?.data?.error || 'Registration failed'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    loading.value = true

    try {
      // Call logout endpoint if token exists
      if (token.value) {
        await axios.post('/api/auth/logout')
      }
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      // Clear local state regardless of API call result
      user.value = null
      token.value = null
      error.value = null
      
      // Remove token from localStorage and axios headers
      localStorage.removeItem('token')
      delete axios.defaults.headers.common['Authorization']
      
      loading.value = false
    }
  }

  const fetchUser = async () => {
    if (!token.value) return { success: false, error: 'No token' }

    loading.value = true
    error.value = null

    try {
      const response = await axios.get('/api/auth/me')
      user.value = response.data.user
      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to fetch user'
      
      // If token is invalid, clear it
      if (err.response?.status === 401) {
        await logout()
      }
      
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  const refreshToken = async () => {
    if (!token.value) return { success: false }

    try {
      const response = await axios.post('/api/auth/refresh')
      const { token: newToken, user: userData } = response.data

      token.value = newToken
      user.value = userData
      
      localStorage.setItem('token', newToken)
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`

      return { success: true }
    } catch (err) {
      console.error('Token refresh failed:', err)
      await logout()
      return { success: false }
    }
  }

  const verifyToken = async () => {
    if (!token.value) return { success: false }

    try {
      const response = await axios.post('/api/auth/verify')
      return { success: true, data: response.data }
    } catch (err) {
      console.error('Token verification failed:', err)
      await logout()
      return { success: false }
    }
  }

  const clearError = () => {
    error.value = null
  }

  // Update user profile
  const updateProfile = async (profileData) => {
    if (!token.value) return { success: false, error: 'Not authenticated' }

    loading.value = true
    error.value = null

    try {
      const response = await axios.put('/api/auth/profile', profileData)
      user.value = response.data.user
      return { success: true, message: response.data.message }
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to update profile'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // Change user password
  const changePassword = async (passwordData) => {
    if (!token.value) return { success: false, error: 'Not authenticated' }

    loading.value = true
    error.value = null

    try {
      const response = await axios.put('/api/auth/password', passwordData)
      return { success: true, message: response.data.message }
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to change password'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }
  
  // Request password reset email
  const requestPasswordReset = async (usernameOrEmail) => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.post('/api/auth/forgot-password', { usernameOrEmail })
      return { success: true, message: response.data.message }
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to request password reset'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }
  
  // Verify reset token
  const verifyResetToken = async (token) => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.get(`/api/auth/reset-password/${token}`)
      return { success: true, username: response.data.username }
    } catch (err) {
      error.value = err.response?.data?.error || 'Invalid or expired token'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }
  
  // Reset password with token
  const resetPassword = async (token, newPassword) => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.post('/api/auth/reset-password', { token, newPassword })
      return { success: true, message: response.data.message }
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to reset password'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // Initialize store
  const init = async () => {
    if (token.value) {
      await fetchUser()
    }
  }

  return {
    // State
    user,
    token,
    loading,
    error,
    requires2fa,
    tempUserFor2fa,
    totpSecret,
    otpauthUrl,
    
    // Getters
    isAuthenticated,
    isLoading,
    currentUser,
    authError,
    userEmail,
    getRequires2fa,
    getTempUserFor2fa,
    getTotpSecret,
    getOtpauthUrl,
    
    // Actions
    login,
    loginWith2fa,
    register,
    logout,
    fetchUser,
    refreshToken,
    verifyToken,
    clearError,
    updateProfile,
    changePassword,
    requestPasswordReset,
    verifyResetToken,
    resetPassword,
    generate2faSecret,
    verify2faCode,
    enable2fa,
    disable2fa,
    init
  }
})
