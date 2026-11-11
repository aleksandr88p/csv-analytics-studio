import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CsvDataset } from '../data/csvImport'
import { CsvImport } from '../features/CsvImport'
import { CsvExport } from '../features/CsvExport'
import { DatasetPicker } from '../features/DatasetPicker'
import { DatasetTable } from '../features/DatasetTable'
import { WelcomeScreen } from '../features/WelcomeScreen'
import { WorkspacePlaceholder } from '../features/WorkspacePlaceholder'
import { SegmentedControl } from './SegmentedControl'
import { savePreferences } from './preferences'
import type { Language, Preferences, Theme, View } from './preferences'
import { useDatasetWorkspace } from './useDatasetWorkspace'

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
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [importedId, setImportedId] = useState<number | null>(null)
  const [pageSize, setPageSize] = useState(25)
  const { workspace, pending, error, save, select, remove, restore, updateCell, clearError } = useDatasetWorkspace()
  const dataset = workspace?.activeDataset
  const viewHeading = useRef<HTMLHeadingElement>(null)
  const language = i18n.resolvedLanguage === 'ru' ? 'ru' : 'en'
  const openImport = () => setImportOpen(true)

  async function importDataset(nextDataset: CsvDataset) {
    const saved = await save(nextDataset)
    if (!saved?.activeDataset) return
    setImportedId(saved.activeDataset.id)
    setImportOpen(false)
    setView('data')
  }

  useLayoutEffect(() => {
    if (importedId !== null) viewHeading.current?.focus()
  }, [importedId])

  useLayoutEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dataset.theme = theme
  }, [language, theme])

  useEffect(() => {
    savePreferences({ language, theme, view })
  }, [language, theme, view])

  const pendingMessage = pending === 'restore' ? 'storage.restoring'
    : pending === 'select' ? 'storage.switching'
    : pending === 'remove' ? 'storage.removing'
    : pending === 'edit' ? 'table.savingCell'
    : null
  const workspaceError = error && error !== 'save' ? error
    : !workspace && !pending && !importOpen ? 'restore'
    : null

  return (
    <>
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <p className="font-semibold tracking-tight">CSV Analytics Studio</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              aria-haspopup="dialog"
              disabled={pending !== null}
              onClick={openImport}
              className="rounded-lg bg-teal-800 px-3 py-2 text-sm font-semibold text-white enabled:cursor-pointer enabled:hover:bg-teal-900 disabled:opacity-50 dark:bg-teal-300 dark:text-slate-950 dark:enabled:hover:bg-teal-200"
            >
              {t('csv.heading')}
            </button>
            <button
              type="button"
              aria-haspopup="dialog"
              disabled={!dataset || pending !== null}
              onClick={() => setExportOpen(true)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold enabled:cursor-pointer enabled:hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:enabled:hover:bg-slate-800"
            >
              {t('export.heading')}
            </button>
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
        {workspace && (
          <DatasetPicker
            workspace={workspace}
            disabled={pending !== null}
            onSelect={(id) => void select(id)}
            onRemove={(id) => void remove(id)}
          />
        )}
        {pendingMessage && <p role="status" className="mt-4 text-sm">{t(pendingMessage)}</p>}
        {workspaceError && (
          <div className="mt-4 space-y-2 rounded-lg bg-red-50 p-3 text-sm text-red-950 dark:bg-red-950 dark:text-red-100">
            <p role="alert">{t(`storage.${workspaceError}Error`)}</p>
            {workspaceError !== 'remove' && (
              <button type="button" onClick={() => void restore()} className="cursor-pointer font-semibold underline">
                {t('storage.retry')}
              </button>
            )}
          </div>
        )}
        {dataset ? (
          <>
            <h1 ref={viewHeading} tabIndex={-1} className="mb-5 mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">
              {t(view)}
            </h1>
            {view === 'data' ? (
              <>
                <section role="status" className="space-y-1 rounded-2xl border border-teal-200 bg-teal-50 p-5 text-sm text-teal-950 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-100">
                  <h2 className="text-lg font-semibold wrap-anywhere">
                    {t(dataset.id === importedId ? 'csv.imported' : 'storage.activeFile', { name: dataset.name })}
                  </h2>
                  <p>{t('csv.dimensions', { rows: dataset.rowCount, columns: dataset.columns.length })}</p>
                  <p>{t('storage.savedLocally')}</p>
                </section>
                <DatasetTable
                  key={dataset.id}
                  dataset={dataset}
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                  editDisabled={pending !== null}
                  onEdit={(rowId, columnId, value) => void updateCell(rowId, columnId, value)}
                />
              </>
            ) : <WorkspacePlaceholder />}
          </>
        ) : workspace && <WelcomeScreen onUpload={openImport} />}
      </main>
      {importOpen && (
        <CsvImport
          saving={pending === 'save'}
          saveError={error === 'save'}
          onImport={(nextDataset) => void importDataset(nextDataset)}
          onDismiss={() => {
            setImportOpen(false)
            if (error === 'save') clearError()
          }}
        />
      )}
      {exportOpen && dataset && <CsvExport dataset={dataset} onDismiss={() => setExportOpen(false)} />}
    </>
  )
}
