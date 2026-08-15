import React from 'react'
import ReactDOM from 'react-dom/client'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import App from './App'
import enTranslations from './i18n/en.json'
import esTranslations from './i18n/es.json'
import './index.css'

// Persisted language preference (per user/browser). Spanish is the default.
const LANGUAGE_STORAGE_KEY = 'datalegal_language'
const SUPPORTED_LANGUAGES = ['es', 'en'] as const
const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY)
const initialLanguage = SUPPORTED_LANGUAGES.includes(storedLanguage as never)
  ? (storedLanguage as string)
  : 'es'

// Initialize i18next with Spanish (default) and English translations.
i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: enTranslations,
    },
    es: {
      translation: esTranslations,
    },
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

// Persist the user's choice whenever the language changes.
i18n.on('languageChanged', (lng) => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lng)
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
