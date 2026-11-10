import { expect, it } from 'vitest'
import { createI18n } from './index'

it('switches the interface between the bundled English and Russian dictionaries', async () => {
  const i18n = await createI18n('en')

  expect(i18n.t('dashboard')).toBe('Dashboard View')
  await i18n.changeLanguage('ru')
  expect(i18n.t('dashboard')).toBe('Дашборд')
  expect(i18n.t('theme')).toBe('Тема')
})
