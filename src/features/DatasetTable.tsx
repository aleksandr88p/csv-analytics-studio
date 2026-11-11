import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flexRender, functionalUpdate, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import type { StoredDataset } from '../storage/datasetStorage'

const pageSizes = [25, 50, 100]
const pageButtonClass = 'rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium enabled:cursor-pointer enabled:hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:enabled:hover:bg-slate-800'

interface DatasetTableProps {
  dataset: StoredDataset
  pageSize: number
  onPageSizeChange: (size: number) => void
  editDisabled: boolean
  onEdit: (rowId: number, columnId: string, value: string) => void
}

export function DatasetTable({ dataset, pageSize, onPageSizeChange, editDisabled, onEdit }: DatasetTableProps) {
  const { t, i18n } = useTranslation()
  const [pageIndex, setPageIndex] = useState(0)
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const scrollArea = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const columns = useMemo<ColumnDef<StoredDataset['rows'][number], string | null>[]>(() =>
    dataset.columns.map((column, index) => ({
      id: column.id,
      accessorFn: (row) => row.values[column.id] ?? null,
      header: () => (
        <>
          <span className="me-2 text-xs font-normal text-slate-600 dark:text-slate-300">#{index + 1}</span>
          <span className="whitespace-pre-wrap wrap-anywhere">
            {column.header?.trim() ? column.header : t('csv.column', { index: index + 1 })}
          </span>
        </>
      ),
      cell: ({ getValue }) => {
        const value = getValue()
        if (value === null || value === '') {
          return <span className="italic text-slate-600 dark:text-slate-400">{t(value === null ? 'csv.missing' : 'table.emptyValue')}</span>
        }
        return value
      },
    })), [dataset.columns, t])

  const pagination = { pageIndex, pageSize }
  const table = useReactTable({
    data: dataset.rows,
    columns,
    getRowId: (row) => String(row.rowId),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { pagination },
    onPaginationChange: (updater) => setPageIndex((current) => functionalUpdate(updater, { pageIndex: current, pageSize }).pageIndex),
    autoResetPageIndex: false,
  })

  useLayoutEffect(() => {
    if (scrollArea.current) scrollArea.current.scrollTop = 0
  }, [pageIndex, pageSize])

  useLayoutEffect(() => {
    if (editingCell === null) {
      returnFocus.current?.querySelector('button')?.focus()
      returnFocus.current = null
    }
  }, [editingCell])

  const pageCount = table.getPageCount()
  const number = new Intl.NumberFormat(i18n.resolvedLanguage)

  return (
    <section className="mt-5 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">{t('table.editHint')}</p>
      <nav aria-label={t('table.pagination')} className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex flex-wrap items-center gap-2 text-sm font-medium">
          {t('table.pageSize')}
          <select
            value={pageSize}
            onChange={(event) => {
              setPageIndex(0)
              onPageSizeChange(Number(event.currentTarget.value))
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
          >
            {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <p role="status" className="me-1 text-sm text-slate-600 dark:text-slate-300">
            {t('table.page', { current: number.format(pageCount ? pageIndex + 1 : 0), total: number.format(pageCount) })}
          </p>
          <button type="button" className={pageButtonClass} disabled={!table.getCanPreviousPage()} onClick={() => table.firstPage()}>
            {t('table.first')}
          </button>
          <button type="button" className={pageButtonClass} disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>
            {t('table.previous')}
          </button>
          <button type="button" className={pageButtonClass} disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
            {t('table.next')}
          </button>
          <button type="button" className={pageButtonClass} disabled={!table.getCanNextPage()} onClick={() => table.lastPage()}>
            {t('table.last')}
          </button>
        </div>
      </nav>
      <div
        ref={scrollArea}
        role="region"
        aria-label={t('table.label')}
        tabIndex={0}
        className="max-h-128 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700"
      >
        <table className="w-full text-sm">
          <caption className="sr-only">{t('table.caption', { name: dataset.name })}</caption>
          <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th key={header.id} scope="col" className="min-w-24 max-w-64 px-3 py-2 text-start align-top">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => {
                  const startEdit = () => {
                    if (!editDisabled && editingCell === null) setEditingCell(cell.id)
                  }
                  return (
                    <td key={cell.id} onDoubleClick={startEdit} className="max-w-64 px-3 py-2 align-top whitespace-pre-wrap wrap-anywhere">
                      {editingCell === cell.id ? (
                        <CellEditor
                          value={cell.getValue<string | null>()}
                          label={t('table.editCell')}
                          onFinish={(value, focusTarget) => {
                            returnFocus.current = focusTarget
                            setEditingCell(null)
                            if (value !== null) onEdit(row.original.rowId, cell.column.id, value)
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          aria-disabled={editDisabled}
                          className="block w-full cursor-text text-start whitespace-pre-wrap wrap-anywhere"
                          onClick={(event) => {
                            if (event.detail === 0) startEdit()
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </button>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount === 0 && <p className="text-sm text-slate-600 dark:text-slate-300">{t('csv.noRows')}</p>}
    </section>
  )
}

function CellEditor({ value, label, onFinish }: {
  value: string | null
  label: string
  onFinish: (value: string | null, focusTarget: HTMLElement | null) => void
}) {
  const [draft, setDraft] = useState(value)
  const finished = useRef(false)

  function finish(save: boolean, focusTarget: HTMLElement | null) {
    if (finished.current) return
    finished.current = true
    onFinish(save && draft !== value ? draft : null, focusTarget)
  }

  return (
    <textarea
      autoFocus
      aria-label={label}
      rows={2}
      cols={1}
      value={draft ?? ''}
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onBlur={() => finish(true, null)}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return
        if (event.key === 'Escape' || (event.key === 'Enter' && !event.shiftKey)) {
          event.preventDefault()
          finish(event.key === 'Enter', event.currentTarget.parentElement)
        }
      }}
      className="block w-full min-w-0 resize-y rounded border border-teal-700 bg-white px-1 dark:border-teal-300 dark:bg-slate-950"
    />
  )
}
