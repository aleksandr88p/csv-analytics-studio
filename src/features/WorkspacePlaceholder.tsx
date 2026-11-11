import { useTranslation } from 'react-i18next'

export function WorkspacePlaceholder() {
  const { t } = useTranslation()

  return (
    <section className="grid min-h-80 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
      <div className="max-w-md">
        <div className="mx-auto mb-5 grid size-12 place-items-center rounded-xl bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-6">
            <path d="M4 4v16h16M8 16v-4m5 4V8m5 8V5" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold">{t('dashboardHeading')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {t('dashboardDescription')}
        </p>
      </div>
    </section>
  )
}
