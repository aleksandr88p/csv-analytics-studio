export type Language = 'en' | 'ru'
export type Theme = 'light' | 'dark'
export type View = 'data' | 'dashboard'

export interface Preferences {
  language: Language
  theme: Theme
  view: View
}

const storageKey = 'csv-analytics-studio:preferences'

export function readPreferences(browserLanguage: string): Preferences {
  const defaults: Preferences = {
    language: /^ru(?:-|$)/i.test(browserLanguage) ? 'ru' : 'en',
    theme: 'light',
    view: 'data',
  }

  try {
    const raw = globalThis.localStorage.getItem(storageKey)
    if (raw === null) return defaults

    const saved: Partial<Record<keyof Preferences, unknown>> | null = JSON.parse(raw)
    return {
      language: saved?.language === 'en' || saved?.language === 'ru' ? saved.language : defaults.language,
      theme: saved?.theme === 'light' || saved?.theme === 'dark' ? saved.theme : defaults.theme,
      view: saved?.view === 'data' || saved?.view === 'dashboard' ? saved.view : defaults.view,
    }
  } catch {
    return defaults
  }
}

export function savePreferences(preferences: Preferences): void {
  try {
    globalThis.localStorage.setItem(storageKey, JSON.stringify(preferences))
  } catch {
    // The current session remains usable when storage is blocked or full.
  }
}
