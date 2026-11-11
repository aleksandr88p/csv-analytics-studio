import { useTranslation } from 'react-i18next'

export function WelcomeScreen({ onUpload }: { onUpload: () => void }) {
  const { t } = useTranslation()

  return (
    <section className="mt-6 grid min-h-80 place-items-center rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
      <div className="max-w-lg">
        <div className="mx-auto mb-5 grid size-12 place-items-center rounded-xl bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-6">
            <path d="M12 16V4m-4 4 4-4 4 4M5 15v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('welcomeHeading')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t('welcomeDescription')}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={onUpload}
            className="cursor-pointer rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 dark:bg-teal-300 dark:text-slate-950 dark:hover:bg-teal-200"
          >
            {t('uploadCsv')}
          </button>
          <button
            type="button"
            disabled
            className="inline-flex flex-wrap items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400"
          >
            {t('tryDemo')}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">{t('comingSoon')}</span>
          </button>
        </div>
      </div>
    </section>
  )
}
