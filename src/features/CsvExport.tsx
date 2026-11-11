import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CsvExportRequest, CsvExportResponse } from '../data/csvExport'
import type { StoredDataset } from '../storage/datasetStorage'

export function CsvExport({ dataset, onDismiss }: { dataset: StoredDataset; onDismiss: () => void }) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [protect, setProtect] = useState(true)
  const [confirmedRisk, setConfirmedRisk] = useState(false)
  const [error, setError] = useState(false)
  const [prepared, setPrepared] = useState<Extract<CsvExportResponse, { type: 'prepared' }> | null>(null)
  const [pending, setPending] = useState<'prepare' | 'serialize' | null>('prepare')
  const [attempt, setAttempt] = useState(0)
  const workerRef = useRef<Worker | null>(null)
  const needsConfirmation = !protect && (prepared?.affectedFields ?? 0) > 0

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  useEffect(() => {
    let worker: Worker | null = null
    setPrepared(null)
    setPending('prepare')
    setError(false)
    setConfirmedRisk(false)

    const fail = () => {
      setError(true)
      setPending(null)
      setPrepared(null)
    }
    try {
      worker = new Worker(new URL('../data/csvExport.worker.ts', import.meta.url), { type: 'module' })
      workerRef.current = worker
      worker.onmessage = ({ data }: MessageEvent<CsvExportResponse>) => {
        if (data.type === 'prepared') {
          setPrepared(data)
          setPending(null)
        } else if (data.type === 'serialized') {
          try {
            downloadBlob(data.blob, data.filename)
            dismiss()
          } catch {
            fail()
          }
        } else {
          fail()
        }
      }
      worker.onerror = fail
      worker.onmessageerror = fail
      const request: CsvExportRequest = { type: 'prepare', datasetId: dataset.id, revision: dataset.revision }
      worker.postMessage(request)
    } catch {
      fail()
    }

    return () => {
      if (worker) {
        worker.onmessage = null
        worker.onerror = null
        worker.onmessageerror = null
        worker.terminate()
      }
      workerRef.current = null
    }
  }, [dataset.id, dataset.revision, attempt])

  function dismiss() {
    dialogRef.current?.close()
    onDismiss()
  }

  function download() {
    if (!prepared || pending || (needsConfirmation && !confirmedRisk)) return
    setError(false)
    setPending('serialize')
    try {
      const request: CsvExportRequest = { type: 'serialize', protect }
      workerRef.current?.postMessage(request)
    } catch {
      setError(true)
      setPending(null)
    }
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.append(link)
    try {
      link.click()
    } finally {
      link.remove()
      // Give the browser time to start reading the Blob before releasing it.
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        dismiss()
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg space-y-4 overflow-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-xl backdrop:bg-slate-950/55 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
    >
      <h2 id={titleId} className="text-lg font-semibold">{t('export.heading')}</h2>
      {prepared && <p className="text-sm wrap-anywhere">{prepared.filename} · UTF-8</p>}
      <label className="flex items-start gap-2 text-sm font-medium">
        <input
          type="checkbox"
          disabled={pending === 'serialize'}
          checked={protect}
          onChange={(event) => {
            setProtect(event.currentTarget.checked)
            setConfirmedRisk(false)
          }}
          className="mt-0.5 size-4 shrink-0 accent-teal-700"
        />
        {t('export.protect')}
      </label>
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t('export.explanation')}</p>
      {pending && <p role="status" className="text-sm">{t(pending === 'prepare' ? 'export.preparing' : 'export.serializing')}</p>}
      {prepared && (
        <div role="status" className="space-y-1 text-sm">
          <p>{t('export.affected', { count: prepared.affectedFields })}</p>
          <p>{t('export.changed', { count: protect ? prepared.affectedFields : 0 })}</p>
        </div>
      )}
      {prepared && prepared.missingFields > 0 && (
        <p className="text-sm text-slate-600 dark:text-slate-300">{t('export.missing', { count: prepared.missingFields })}</p>
      )}
      {needsConfirmation && (
        <div className="space-y-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">
          <p role="alert">{t('export.warning')}</p>
          <label className="flex items-start gap-2 font-medium">
            <input
              type="checkbox"
              disabled={pending === 'serialize'}
              checked={confirmedRisk}
              onChange={(event) => setConfirmedRisk(event.currentTarget.checked)}
              className="mt-0.5 size-4 shrink-0 accent-teal-700"
            />
            {t('export.confirmRisk')}
          </label>
        </div>
      )}
      {error && (
        <div className="space-y-2 text-sm text-red-800 dark:text-red-200">
          <p role="alert">{t('export.error')}</p>
          <button type="button" onClick={() => setAttempt((value) => value + 1)} className="cursor-pointer font-semibold underline">
            {t('export.retry')}
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!prepared || pending !== null || (needsConfirmation && !confirmedRisk)}
          onClick={download}
          className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white enabled:cursor-pointer enabled:hover:bg-teal-900 disabled:opacity-50 dark:bg-teal-300 dark:text-slate-950 dark:enabled:hover:bg-teal-200"
        >
          {t('export.download')}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {t('csv.cancel')}
        </button>
      </div>
    </dialog>
  )
}
