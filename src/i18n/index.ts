import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { Language } from '../app/preferences'
import { csvEn, csvRu } from './csv'
import { storageEn, storageRu } from './storage'
import { tableEn, tableRu } from './table'
import { exportEn, exportRu } from './export'

const en = {
  workspace: 'Workspace',
  data: 'Data View',
  dashboard: 'Dashboard View',
  language: 'Language',
  theme: 'Theme',
  light: 'Light',
  dark: 'Dark',
  welcomeHeading: 'Welcome to CSV Analytics Studio',
  welcomeDescription: 'Upload a CSV file to start working with your data.',
  uploadCsv: 'Upload CSV',
  tryDemo: 'Try demo data',
  comingSoon: 'Coming soon',
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
  welcomeHeading: 'Добро пожаловать в CSV Analytics Studio',
  welcomeDescription: 'Загрузите CSV-файл, чтобы начать работу с данными.',
  uploadCsv: 'Загрузить CSV',
  tryDemo: 'Попробовать демоданные',
  comingSoon: 'Скоро',
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
      en: { translation: { ...en, csv: csvEn, storage: storageEn, table: tableEn, export: exportEn } },
      ru: { translation: { ...ru, csv: csvRu, storage: storageRu, table: tableRu, export: exportRu } },
    },
    interpolation: { escapeValue: false },
  })
  return i18n
}
