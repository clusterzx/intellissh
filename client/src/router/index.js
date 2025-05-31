import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

// Views
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import TerminalView from '@/views/TerminalView.vue'
import SshDebugView from '@/views/SshDebugView.vue'
import SettingsView from '@/views/SettingsView.vue'
import ProfileView from '@/views/ProfileView.vue'
import ForgotPasswordView from '@/views/ForgotPasswordView.vue'
import ResetPasswordView from '@/views/ResetPasswordView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { requiresAuth: false }
  },
  {
    path: '/terminal/:sessionId',
    name: 'terminal',
    component: TerminalView,
    meta: { requiresAuth: true },
    props: true
  },
  {
    path: '/terminal',
    name: 'terminal-new',
    component: TerminalView,
    meta: { requiresAuth: true }
  },
  {
    path: '/debug',
    name: 'ssh-debug',
    component: SshDebugView,
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView,
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'profile',
    component: ProfileView,
    meta: { requiresAuth: true }
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: ForgotPasswordView,
    meta: { requiresAuth: false }
  },
  {
    path: '/reset-password/:token',
    name: 'reset-password',
    component: ResetPasswordView,
    meta: { requiresAuth: false },
    props: true
  },
  // Catch all redirect to home
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guards
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // Initialize auth store if not already done
  if (!authStore.user && authStore.token) {
    await authStore.init()
  }

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const isAuthenticated = authStore.isAuthenticated

  if (requiresAuth && !isAuthenticated) {
    // Redirect to login if route requires auth and user is not authenticated
    next({
      name: 'login',
      query: { redirect: to.fullPath }
    })
  } else if (!requiresAuth && isAuthenticated && to.name === 'login') {
    // Redirect to home if user is authenticated and trying to access login
    next({ name: 'home' })
  } else {
    // Proceed with navigation
    next()
  }
})

export default router
