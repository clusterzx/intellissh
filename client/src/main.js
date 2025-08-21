import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/main.css'
import { createI18n } from 'vue-i18n'
const savedLanguage = localStorage.getItem('language') || 'en'

// Use import.meta.glob to load all locale messages
const messages = Object.fromEntries(
  Object.entries(import.meta.glob('./locales/*.json', { eager: true }))
    .map(([key, value]) => {
      const locale = key.match(/\.\/locales\/(.*)\.json$/)[1]
      return [locale, value.default]
    })
)

const i18n = createI18n({
  legacy: false,
  locale: savedLanguage,
  fallbackLocale: 'en',
  messages, // Pass the dynamically loaded messages
})

const app = createApp(App)

// Use Pinia for state management
app.use(createPinia())

// Use Vue Router
app.use(router)

// Use Vue I18n
app.use(i18n)

// Mount the app
app.mount('#app')
