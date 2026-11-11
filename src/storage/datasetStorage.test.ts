import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { CsvDataset } from '../data/csvImport'
import { DatasetStorage } from './datasetStorage'

const source: CsvDataset = {
  name: 'first.csv',
  options: { delimiter: ';', encoding: 'windows-1251', hasHeaders: true },
  columns: [
    { id: 'column-1', header: 'Name' },
    { id: 'column-2', header: 'Name' },
  ],
  rows: [['00123', ''], ['007', null]],
}

let db: DatasetStorage

beforeEach(() => {
  db = new DatasetStorage('csv-studio-storage-test')
})

afterEach(async () => {
  vi.restoreAllMocks()
  await db.delete()
})

it('stores metadata and separately keyed rows, then restores the last selected dataset on reopen', async () => {
  const first = (await db.save(source)).activeDataset!
  expect(await db.datasets.get(first.id)).toEqual({
    id: first.id,
    name: source.name,
    options: source.options,
    columns: source.columns,
    rowCount: 2,
    revision: 1,
  })
  expect(await db.rows.get([first.id, 1])).toEqual({
    datasetId: first.id, rowId: 1, order: 0, values: { 'column-1': '00123', 'column-2': '' },
  })
  expect(await db.rows.get([first.id, 2])).toMatchObject({
    order: 1, values: { 'column-1': '007', 'column-2': null },
  })

  const second = (await db.save({ ...source, name: 'second.csv', rows: [['00456', 'text']] })).activeDataset!
  expect(second.id).not.toBe(first.id)
  expect((await db.restore()).activeDataset).toEqual(second)
  expect((await db.select(first.id)).activeDataset).toEqual(first)

  const name = db.name
  db.close()
  db = new DatasetStorage(name)

  const restored = await db.restore()
  expect(restored.datasets.map((dataset) => dataset.name)).toEqual(['second.csv', 'first.csv'])
  expect(restored.activeDataset).toEqual(first)
  expect((await db.select(second.id)).activeDataset).toEqual(second)
})

it('deletes only the requested dataset and selects the latest remaining dataset when necessary', async () => {
  const first = (await db.save(source)).activeDataset!
  const second = (await db.save({ ...source, name: 'second.csv' })).activeDataset!
  await db.select(first.id)

  const remaining = await db.remove(first.id)
  expect(remaining.datasets.map(({ id }) => id)).toEqual([second.id])
  expect(remaining.activeDataset).toEqual(second)
  expect(await db.rows.where('datasetId').equals(first.id).count()).toBe(0)
  expect(await db.rows.where('datasetId').equals(second.id).count()).toBe(source.rows.length)
  expect((await db.restore()).activeDataset).toEqual(second)

  expect(await db.remove(second.id)).toEqual({ datasets: [], activeDataset: null })
  expect(await db.preferences.count()).toBe(0)
  expect(await db.restore()).toEqual({ datasets: [], activeDataset: null })
})

it('rolls back metadata and any written rows when a new import fails', async () => {
  const before = await db.save(source)
  const bulkAdd = vi.spyOn(db.rows, 'bulkAdd').mockImplementationOnce((rows) => db.rows.add(rows[0]).then(() => {
    throw new DOMException('Storage quota exceeded', 'QuotaExceededError')
  }))

  await expect(db.save({ ...source, name: 'failed.csv' })).rejects.toMatchObject({ name: 'QuotaExceededError' })
  expect(bulkAdd).toHaveBeenCalledOnce()
  expect(await db.restore()).toEqual(before)
  expect(await db.rows.count()).toBe(source.rows.length)

  const retry = await db.save({ ...source, name: 'retry.csv' })
  expect(retry.datasets.map((dataset) => dataset.name)).toEqual(['retry.csv', 'first.csv'])
  expect(retry.activeDataset?.name).toBe('retry.csv')
})

it('leaves the active selection intact if the requested dataset no longer exists', async () => {
  const saved = await db.save(source)
  await expect(db.select(1000)).rejects.toThrow('Dataset does not exist')
  expect(await db.restore()).toEqual(saved)
})

it('writes only the edited row and restores the text and revision when the database reopens', async () => {
  const dataset = (await db.save(source)).activeDataset!
  const put = vi.spyOn(db.rows, 'put')
  const bulkAdd = vi.spyOn(db.rows, 'bulkAdd')
  const update = await db.updateCell(dataset, 1, 'column-1', '00042')
  await db.updateCell({ id: dataset.id, revision: update.revision }, 2, 'column-2', '')
  expect(put.mock.calls.map(([row]) => row.rowId)).toEqual([1, 2])
  expect(bulkAdd).not.toHaveBeenCalled()

  const name = db.name
  db.close()
  db = new DatasetStorage(name)
  expect((await db.restore()).activeDataset).toMatchObject({
    id: dataset.id,
    revision: 3,
    rows: [
      { rowId: 1, order: 0, values: { 'column-1': '00042', 'column-2': '' } },
      { rowId: 2, order: 1, values: { 'column-1': '007', 'column-2': '' } },
    ],
  })
  await expect(db.updateCell(dataset, 1, 'column-1', 'stale value')).rejects.toThrow('Dataset has changed')
  expect(await db.rows.get([dataset.id, 1])).toMatchObject({ values: { 'column-1': '00042' } })
})

it('rolls back the cell write if the revision cannot be updated', async () => {
  const before = await db.save(source)
  vi.spyOn(db.datasets, 'update').mockImplementationOnce(() => {
    throw new Error('Revision write failed')
  })

  await expect(db.updateCell(before.activeDataset!, 1, 'column-1', 'unsaved')).rejects.toThrow('Revision write failed')
  expect(await db.restore()).toEqual(before)
})

it('reads a revision-checked export snapshot without changing rows, metadata or active selection', async () => {
  const first = (await db.save(source)).activeDataset!
  const before = await db.save({ ...source, name: 'second.csv' })
  expect(await db.readDataset(first.id, first.revision)).toEqual(first)
  await expect(db.readDataset(first.id, first.revision + 1)).rejects.toThrow('Dataset has changed')
  expect(await db.restore()).toEqual(before)
})
