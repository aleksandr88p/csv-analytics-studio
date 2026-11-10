import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { Language } from '../app/preferences'

const en = {
  workspace: 'Workspace',
  data: 'Data View',
  dashboard: 'Dashboard View',
  language: 'Language',
  theme: 'Theme',
  light: 'Light',
  dark: 'Dark',
  dataHeading: 'No dataset open',
  dataDescription: 'Your CSV data will appear here once import is available.',
  dashboardHeading: 'Your dashboard is empty',
  dashboardDescription: 'Charts for your active dataset will appear here once visualization is available.',
}

const ru: Record<keyof typeof en, string> = {
  workspace: 'Рабочая область',
  data: 'Данные',
  dashboard: 'Дашборд',
  language: 'Язык',
  theme: 'Тема',
  light: 'Светлая',
  dark: 'Тёмная',
  dataHeading: 'Нет открытого набора данных',
  dataDescription: 'Здесь появятся данные CSV, когда станет доступен импорт.',
  dashboardHeading: 'Дашборд пока пуст',
  dashboardDescription: 'Здесь появятся графики активного набора, когда станет доступна визуализация.',
}

export async function createI18n(language: Language) {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({
    lng: language,
    fallbackLng: 'en',
    supportedLngs: ['en', 'ru'],
    resources: {
      en: { translation: en },
      ru: { translation: ru },
    },
    interpolation: { escapeValue: false },
  })
  return i18n
}
