import { useEffect, useLayoutEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { WorkspacePlaceholder } from '../features/WorkspacePlaceholder'
import { SegmentedControl } from './SegmentedControl'
import { savePreferences } from './preferences'
import type { Language, Preferences, Theme, View } from './preferences'

const views: View[] = ['data', 'dashboard']
const languages = [
  { value: 'en', label: 'EN English', content: 'EN', lang: 'en' },
  { value: 'ru', label: 'RU Русский', content: 'RU', lang: 'ru' },
] as const
const themeIcons = {
  light: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="size-5">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5" />
    </svg>
  ),
  dark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" className="size-5">
      <path d="M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10Z" />
    </svg>
  ),
}

export function App({ initialPreferences }: { initialPreferences: Preferences }) {
  const { t, i18n } = useTranslation()
  const [theme, setTheme] = useState(initialPreferences.theme)
  const [view, setView] = useState(initialPreferences.view)
  const language = i18n.resolvedLanguage === 'ru' ? 'ru' : 'en'

  useLayoutEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dataset.theme = theme
  }, [language, theme])

  useEffect(() => {
    savePreferences({ language, theme, view })
  }, [language, theme, view])

  return (
    <>
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <p className="font-semibold tracking-tight">CSV Analytics Studio</p>
          <div className="flex flex-wrap gap-3">
            <SegmentedControl<Language>
              label={t('language')}
              options={languages}
              value={language}
              onChange={(option) => void i18n.changeLanguage(option)}
            />
            <SegmentedControl<Theme>
              label={t('theme')}
              options={[
                { value: 'light', label: t('light'), content: themeIcons.light },
                { value: 'dark', label: t('dark'), content: themeIcons.dark },
              ]}
              value={theme}
              onChange={setTheme}
            />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div role="group" aria-label={t('workspace')} className="flex flex-wrap gap-1">
          {views.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === view}
              onClick={() => setView(option)}
              className="cursor-pointer rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 aria-pressed:bg-teal-800 aria-pressed:text-white dark:text-slate-300 dark:hover:bg-slate-800 dark:aria-pressed:bg-teal-300 dark:aria-pressed:text-slate-950"
            >
              {t(option)}
            </button>
          ))}
        </div>
        <h1 className="mb-5 mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">{t(view)}</h1>
        <WorkspacePlaceholder view={view} />
      </main>
    </>
  )
}
