import { useCallback, useEffect, useRef, useState } from 'react'
import type { CsvDataset } from '../data/csvImport'
import { datasetStorage } from '../storage/datasetStorage'
import type { DatasetWorkspace } from '../storage/datasetStorage'

type Operation = 'restore' | 'save' | 'select' | 'remove' | 'edit'

export function useDatasetWorkspace() {
  const [workspace, setWorkspace] = useState<DatasetWorkspace | null>(null)
  const [pending, setPending] = useState<Operation | null>('restore')
  const [error, setError] = useState<Operation | null>(null)
  const running = useRef(false)

  const run = useCallback(async (operation: Operation, action: () => Promise<DatasetWorkspace>) => {
    if (running.current) return null
    running.current = true
    setPending(operation)
    setError(null)
    try {
      const next = await action()
      setWorkspace(next)
      return next
    } catch {
      setError(operation)
      return null
    } finally {
      running.current = false
      setPending(null)
    }
  }, [])

  const restore = useCallback(() => run('restore', () => datasetStorage.restore()), [run])

  useEffect(() => {
    void restore()
  }, [restore])

  function updateCell(rowId: number, columnId: string, value: string) {
    const dataset = workspace?.activeDataset
    if (!workspace || !dataset) return

    return run('edit', async () => {
      const { row, revision } = await datasetStorage.updateCell(dataset, rowId, columnId, value)
      return {
        datasets: workspace.datasets.map((item) => item.id === dataset.id ? { ...item, revision } : item),
        activeDataset: {
          ...dataset,
          revision,
          rows: dataset.rows.map((item) => item.rowId === rowId ? row : item),
        },
      }
    })
  }

  return {
    workspace,
    pending,
    error,
    restore,
    save: (dataset: CsvDataset) => run('save', () => datasetStorage.save(dataset)),
    select: (id: number) => run('select', () => datasetStorage.select(id)),
    remove: (id: number) => run('remove', () => datasetStorage.remove(id)),
    updateCell,
    clearError: () => setError(null),
  }
}
