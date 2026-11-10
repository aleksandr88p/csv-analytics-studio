import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import { App } from './app/App'
import { readPreferences } from './app/preferences'
import { createI18n } from './i18n'
import './styles.css'

async function start() {
  const preferences = readPreferences(navigator.language)
  document.documentElement.lang = preferences.language
  document.documentElement.dataset.theme = preferences.theme

  const i18n = await createI18n(preferences.language)
  const root = document.getElementById('root')
  if (!root) throw new Error('Missing application root')

  createRoot(root).render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <App initialPreferences={preferences} />
      </I18nextProvider>
    </StrictMode>,
  )
}

void start()
