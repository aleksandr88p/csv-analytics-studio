import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CsvDataset, CsvImportOptions, CsvImportResult } from '../data/csvImport'

const defaultOptions: CsvImportOptions = { delimiter: 'auto', hasHeaders: true, encoding: 'utf-8' }
const previewLimit = 20
const separators = {
  auto: 'csv.auto',
  ',': 'csv.comma',
  ';': 'csv.semicolon',
  '\t': 'csv.tab',
} as const

interface Draft {
  file: File
  options: CsvImportOptions
}

export function CsvImport({
  saving,
  saveError,
  onImport,
  onDismiss,
}: {
  saving: boolean
  saveError: boolean
  onImport: (dataset: CsvDataset) => void
  onDismiss: () => void
}) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [response, setResponse] = useState<{ draft: Draft; result: CsvImportResult } | null>(null)
  const result = response?.draft === draft ? response?.result : undefined

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  useEffect(() => {
    if (!draft) return

    let worker: Worker | undefined
    const fail = () => {
      setResponse({ draft, result: { ok: false, error: { code: 'read' } } })
      worker?.terminate()
    }

    try {
      worker = new Worker(new URL('../data/csvImport.worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = (event: MessageEvent<CsvImportResult>) => {
        setResponse({ draft, result: event.data })
        worker?.terminate()
      }
      worker.onerror = fail
      worker.onmessageerror = fail
      worker.postMessage(draft)
    } catch {
      fail()
    }

    return () => worker?.terminate()
  }, [draft])

  function updateOptions(options: Partial<CsvImportOptions>) {
    if (!draft) return
    setResponse(null)
    setDraft({ ...draft, options: { ...draft.options, ...options } })
  }

  function dismiss() {
    if (saving) return
    dialogRef.current?.close()
    onDismiss()
  }

  const error = result && !result.ok ? result.error : null
  const errorMessages = {
    empty: t('csv.empty'),
    encoding: t('csv.decodeError'),
    read: t('csv.readError'),
    quotes: error?.code === 'quotes' && error.record !== undefined
      ? t('csv.quotes', { record: error.record })
      : t('csv.quotesUnknown'),
  }
  const preview = result?.ok ? result.dataset : null
  const warnings = result?.ok ? result.warnings : null
  const warningMessages = warnings ? [
    warnings.delimiterFallback && t('csv.delimiterFallback'),
    warnings.unevenRows > 0 && t('csv.unevenRows', { count: warnings.unevenRows }),
    warnings.duplicateHeaders > 0 && t('csv.duplicateHeaders', { count: warnings.duplicateHeaders }),
    warnings.blankHeaders > 0 && t('csv.blankHeaders', { count: warnings.blankHeaders }),
  ].filter(Boolean) : []

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        dismiss()
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl space-y-5 overflow-auto rounded-2xl border border-slate-200 bg-white p-4 text-slate-950 shadow-xl backdrop:bg-slate-950/55 sm:p-6 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
    >
      <div>
        <h2 id={titleId} className="text-lg font-semibold">{t('csv.heading')}</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('csv.description')}</p>
      </div>

      <label className="block text-sm font-medium">
        {t('csv.file')}
        <input
          type="file"
          disabled={saving}
          accept=".csv,text/csv"
          className="mt-1 block w-full rounded-lg border border-slate-300 p-2 file:me-3 file:cursor-pointer file:rounded-md file:bg-slate-100 file:px-3 file:py-1.5 dark:border-slate-600 dark:file:bg-slate-700 dark:file:text-slate-100"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            if (file) {
              setResponse(null)
              setDraft({ file, options: defaultOptions })
            }
          }}
        />
      </label>

      {draft && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">
              {t('csv.delimiter')}
              <select
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-600 dark:bg-slate-950"
                value={draft.options.delimiter}
                disabled={saving}
                onChange={(event) => updateOptions({ delimiter: event.currentTarget.value as CsvImportOptions['delimiter'] })}
              >
                {Object.entries(separators).map(([value, key]) => <option key={value} value={value}>{t(key)}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">
              {t('csv.encoding')}
              <select
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-600 dark:bg-slate-950"
                value={draft.options.encoding}
                disabled={saving}
                onChange={(event) => updateOptions({ encoding: event.currentTarget.value as CsvImportOptions['encoding'] })}
              >
                <option value="utf-8">UTF-8</option>
                <option value="windows-1251">Windows-1251</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                className="size-4 accent-teal-700"
                checked={draft.options.hasHeaders}
                disabled={saving}
                onChange={(event) => updateOptions({ hasHeaders: event.currentTarget.checked })}
              />
              {t('csv.headers')}
            </label>
          </div>

          {!result && <p role="status" className="text-sm">{t('csv.reading')}</p>}
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950 dark:text-red-100">
              {errorMessages[error.code]}
            </p>
          )}

          {preview && (
            <div className="space-y-3">
              <div role="status">
                <h3 className="font-semibold">{t('csv.preview')}</h3>
                <p className="text-sm font-medium wrap-anywhere">{preview.name}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {t('csv.dimensions', { rows: preview.rows.length, columns: preview.columns.length })}
                  {' · '}
                  {t('csv.detectedDelimiter', { separator: t(separators[preview.options.delimiter]) })}
                </p>
              </div>

              {warningMessages.length > 0 && (
                <ul role="status" className="list-inside list-disc space-y-1 rounded-lg bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">
                  {warningMessages.map((message) => <li key={String(message)}>{message}</li>)}
                </ul>
              )}

              <CsvPreview dataset={preview} />
            </div>
          )}
        </>
      )}

      {saving && <p role="status" className="text-sm">{t('storage.saving')}</p>}
      {saveError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950 dark:text-red-100">
          {t('storage.saveError')}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!preview || saving}
          onClick={() => {
            if (!preview) return
            onImport(preview)
          }}
          className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white enabled:cursor-pointer enabled:hover:bg-teal-900 disabled:opacity-50 dark:bg-teal-300 dark:text-slate-950 dark:enabled:hover:bg-teal-200"
        >
          {t('csv.confirm')}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={dismiss}
          className="rounded-lg px-4 py-2 text-sm font-medium enabled:cursor-pointer enabled:hover:bg-slate-100 disabled:opacity-50 dark:enabled:hover:bg-slate-800"
        >
          {t('csv.cancel')}
        </button>
      </div>
    </dialog>
  )
}

function CsvPreview({ dataset }: { dataset: CsvDataset }) {
  const { t } = useTranslation()
  const rows = dataset.rows.slice(0, previewLimit)

  return (
    <>
      <div role="region" aria-label={t('csv.preview')} tabIndex={0} className="max-h-128 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-start text-sm">
          <caption className="sr-only">
            {t('csv.previewCount', { shown: rows.length, total: dataset.rows.length })}
          </caption>
          <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
            <tr>
              {dataset.columns.map((column, index) => (
                <th key={column.id} scope="col" className="min-w-24 max-w-64 px-3 py-2 text-start align-top">
                  <span className="me-2 text-xs font-normal text-slate-600 dark:text-slate-300">#{index + 1}</span>
                  <span className="whitespace-pre-wrap wrap-anywhere">
                    {column.header?.trim() ? column.header : t('csv.column', { index: index + 1 })}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {rows.map((row, index) => (
              <tr key={index}>
                {dataset.columns.map((column, columnIndex) => (
                  <td key={column.id} className="max-w-64 px-3 py-2 align-top whitespace-pre-wrap wrap-anywhere">
                    {row[columnIndex] ?? <span aria-label={t('csv.missing')} className="text-slate-500 dark:text-slate-400">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {rows.length ? t('csv.previewCount', { shown: rows.length, total: dataset.rows.length }) : t('csv.noRows')}
      </p>
    </>
  )
}
