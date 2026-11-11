import Dexie from 'dexie'
import type { EntityTable, Table } from 'dexie'
import type { CsvDataset } from '../data/csvImport'

type DatasetMetadata = Omit<CsvDataset, 'rows'> & {
  id: number
  revision: number
  rowCount: number
}

interface DatasetRow {
  datasetId: number
  rowId: number
  order: number
  values: Record<string, string | null>
}

export type StoredDataset = DatasetMetadata & { rows: DatasetRow[] }

export interface DatasetWorkspace {
  datasets: DatasetMetadata[]
  activeDataset: StoredDataset | null
}

const activeKey = 'activeDataset'

export class DatasetStorage extends Dexie {
  declare datasets: EntityTable<DatasetMetadata, 'id'>
  declare rows: Table<DatasetRow, [number, number]>
  declare preferences: Table<{ key: typeof activeKey; datasetId: number }, typeof activeKey>

  constructor(name = 'csv-analytics-studio') {
    super(name)
    this.version(1).stores({
      datasets: '++id',
      rows: '[datasetId+rowId], datasetId',
      preferences: 'key',
    })
  }

  restore(): Promise<DatasetWorkspace> {
    return this.transaction('r', [this.datasets, this.rows, this.preferences], () => this.readWorkspace())
  }

  readDataset(id: number, revision: number): Promise<StoredDataset> {
    return this.transaction('r', [this.datasets, this.rows], async () => {
      const metadata = await this.datasets.get(id)
      if (!metadata || metadata.revision !== revision) throw new Error('Dataset has changed')
      const rows = await this.rows.where('datasetId').equals(id).sortBy('order')
      return { ...metadata, rows }
    })
  }

  save(dataset: CsvDataset): Promise<DatasetWorkspace> {
    const { rows, ...details } = dataset
    const metadata = { ...details, revision: 1, rowCount: rows.length }
    return this.transaction('rw', [this.datasets, this.rows, this.preferences], async () => {
      const id = await this.datasets.add(metadata)
      const storedRows = rows.map((row, index) => ({
        datasetId: id,
        rowId: index + 1,
        order: index,
        values: Object.fromEntries(details.columns.map((column, position) => [column.id, row[position] ?? null])),
      }))
      await this.rows.bulkAdd(storedRows)
      await this.preferences.put({ key: activeKey, datasetId: id })
      return this.readWorkspace({ ...metadata, id, rows: storedRows })
    })
  }

  select(id: number): Promise<DatasetWorkspace> {
    return this.transaction('rw', [this.datasets, this.rows, this.preferences], async () => {
      if (!await this.datasets.get(id)) throw new Error('Dataset does not exist')
      await this.preferences.put({ key: activeKey, datasetId: id })
      return this.readWorkspace()
    })
  }

  updateCell(
    dataset: Pick<StoredDataset, 'id' | 'revision'>,
    rowId: number,
    columnId: string,
    value: string,
  ): Promise<{ row: DatasetRow; revision: number }> {
    return this.transaction('rw', [this.datasets, this.rows], async () => {
      const metadata = await this.datasets.get(dataset.id)
      if (!metadata || metadata.revision !== dataset.revision) {
        throw new Error('Dataset has changed')
      }
      const row = await this.rows.get([dataset.id, rowId])
      if (!row || !metadata.columns.some((column) => column.id === columnId)) {
        throw new Error('Cell does not exist')
      }
      if (row.values[columnId] === value) return { row, revision: metadata.revision }

      const updatedRow = { ...row, values: { ...row.values, [columnId]: value } }
      const revision = metadata.revision + 1
      await this.rows.put(updatedRow)
      await this.datasets.update(dataset.id, { revision })
      return { row: updatedRow, revision }
    })
  }

  remove(id: number): Promise<DatasetWorkspace> {
    return this.transaction('rw', [this.datasets, this.rows, this.preferences], async () => {
      await this.rows.where('datasetId').equals(id).delete()
      await this.datasets.delete(id)

      const workspace = await this.readWorkspace()
      if (workspace.activeDataset) {
        await this.preferences.put({ key: activeKey, datasetId: workspace.activeDataset.id })
      } else {
        await this.preferences.delete(activeKey)
      }
      return workspace
    })
  }

  private async readWorkspace(savedDataset?: StoredDataset): Promise<DatasetWorkspace> {
    const datasets = await this.datasets.orderBy('id').reverse().toArray()
    if (savedDataset) return { datasets, activeDataset: savedDataset }

    const preference = await this.preferences.get(activeKey)
    const metadata = datasets.find((dataset) => dataset.id === preference?.datasetId) ?? datasets[0]
    if (!metadata) return { datasets, activeDataset: null }

    const rows = await this.rows.where('datasetId').equals(metadata.id).sortBy('order')
    return { datasets, activeDataset: { ...metadata, rows } }
  }
}

export const datasetStorage = new DatasetStorage()
