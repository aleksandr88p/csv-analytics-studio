import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readPreferences, savePreferences } from './preferences'
import type { Preferences } from './preferences'

const storageKey = 'csv-analytics-studio:preferences'

beforeEach(() => {
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  })
})

afterEach(() => vi.unstubAllGlobals())

describe('preferences', () => {
  it('starts in Data View with a light theme and a supported browser language', () => {
    expect(readPreferences('ru-RU')).toEqual({ language: 'ru', theme: 'light', view: 'data' })
    expect(readPreferences('es-ES').language).toBe('en')
  })

  it('restores the language, theme and view saved by the user', () => {
    const preferences: Preferences = { language: 'en', theme: 'dark', view: 'dashboard' }
    savePreferences(preferences)
    expect(readPreferences('ru-RU')).toEqual(preferences)
  })

  it('keeps valid values when other stored fields are invalid', () => {
    localStorage.setItem(storageKey, '{"language":"es","theme":"dark","view":null}')
    expect(readPreferences('ru')).toEqual({ language: 'ru', theme: 'dark', view: 'data' })
  })

  it('falls back when stored JSON is damaged', () => {
    localStorage.setItem(storageKey, '{')
    expect(readPreferences('en')).toEqual({ language: 'en', theme: 'light', view: 'data' })
  })

  it('remains usable when browser storage throws on access', () => {
    vi.stubGlobal('localStorage', {
      getItem() { throw new Error('Storage disabled') },
      setItem() { throw new Error('Storage disabled') },
    })
    const defaults = readPreferences('en')
    expect(defaults).toEqual({ language: 'en', theme: 'light', view: 'data' })
    expect(() => savePreferences(defaults)).not.toThrow()
  })
})
