import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DatasetWorkspace } from '../storage/datasetStorage'

interface DatasetPickerProps {
  workspace: DatasetWorkspace
  disabled: boolean
  onSelect: (id: number) => void
  onRemove: (id: number) => void
}

export function DatasetPicker({ workspace, disabled, onSelect, onRemove }: DatasetPickerProps) {
  const { t } = useTranslation()
  const promptId = useId()
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const { activeDataset, datasets } = workspace
  if (!activeDataset) return null

  const confirming = confirmingId === activeDataset.id
  const nameCounts = new Map<string, number>()
  for (const { name } of datasets) nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1)

  return (
    <div className="mt-5 space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-0 text-sm font-medium">
          {t('storage.datasets')}
          <select
            className="mt-1 block w-full max-w-xs truncate rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
            value={activeDataset.id}
            disabled={disabled}
            onChange={(event) => {
              setConfirmingId(null)
              onSelect(Number(event.currentTarget.value))
            }}
          >
            {datasets.map(({ id, name }) => (
              <option key={id} value={id}>{name}{(nameCounts.get(name) ?? 0) > 1 ? ` (#${id})` : ''}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={disabled}
          aria-expanded={confirming}
          onClick={() => setConfirmingId(confirming ? null : activeDataset.id)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium enabled:cursor-pointer enabled:hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:enabled:hover:bg-slate-800"
        >
          {t('storage.remove')}
        </button>
      </div>
      {confirming && (
        <div role="group" aria-labelledby={promptId} className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-950 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          <p id={promptId} className="wrap-anywhere">{t('storage.confirmPrompt', { name: activeDataset.name })}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRemove(activeDataset.id)}
              className="rounded-lg bg-red-800 px-3 py-2 font-semibold text-white enabled:cursor-pointer disabled:opacity-50"
            >
              {t('storage.confirmRemove')}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setConfirmingId(null)}
              className="rounded-lg px-3 py-2 font-medium enabled:cursor-pointer enabled:hover:bg-red-100 dark:enabled:hover:bg-red-900"
            >
              {t('csv.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
