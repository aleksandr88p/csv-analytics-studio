// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { act, StrictMode } from 'react'
import Papa from 'papaparse'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { parseCsv } from '../data/csvImport'
import { prepareCsvExport, serializeCsv } from '../data/csvExport'
import type { CsvExportRequest, CsvExportResponse } from '../data/csvExport'
import type { CsvImportOptions, CsvImportResult } from '../data/csvImport'
import { createI18n } from '../i18n'
import { datasetStorage } from '../storage/datasetStorage'
import { App } from './App'
import { readPreferences, savePreferences } from './preferences'
import type { Preferences } from './preferences'

let root: Root
let pendingParse: Promise<void>
let pendingExport: Promise<void>

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  // Run the real parser in-process because the test DOM has no Vite worker runtime.
  vi.stubGlobal('Worker', class {
    onmessage?: (event: MessageEvent<CsvImportResult | CsvExportResponse>) => void
    prepared: ReturnType<typeof prepareCsvExport> | null = null

    postMessage(data: { file: File; options: CsvImportOptions } | CsvExportRequest) {
      if (!('file' in data)) {
        pendingExport = this.export(data)
        return
      }
      pendingParse = data.file.arrayBuffer().then((bytes) => {
        const { file, options } = data
        this.onmessage?.(new MessageEvent('message', { data: parseCsv(file.name, bytes, options) }))
      })
    }

    async export(request: CsvExportRequest) {
      let response: CsvExportResponse
      try {
        if (request.type === 'prepare') {
          this.prepared = prepareCsvExport(await datasetStorage.readDataset(request.datasetId, request.revision))
          response = { type: 'prepared', ...this.prepared }
        } else {
          if (!this.prepared) throw new Error('Export not ready')
          const csv = serializeCsv(this.prepared, request.protect)
          response = { type: 'serialized', blob: new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }), filename: this.prepared.filename }
        }
      } catch {
        response = { type: 'error' }
      }
      this.onmessage?.(new MessageEvent('message', { data: response }))
    }

    terminate() {
      this.onmessage = undefined
    }
  })
  const container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(async () => {
  act(() => root.unmount())
  document.body.replaceChildren()
  localStorage.clear()
  await datasetStorage.transaction('rw', [datasetStorage.datasets, datasetStorage.rows, datasetStorage.preferences], async () => {
    await datasetStorage.rows.clear()
    await datasetStorage.datasets.clear()
    await datasetStorage.preferences.clear()
  })
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function runStorageAction(method: 'restore' | 'save' | 'select' | 'remove' | 'updateCell', action: () => void) {
  const operation = vi.spyOn(datasetStorage, method)
  try {
    act(action)
    expect(operation).toHaveBeenCalledOnce()
    await act(async () => {
      await operation.mock.results[0].value
    })
  } finally {
    operation.mockRestore()
  }
}

async function renderApp(preferences: Preferences) {
  savePreferences(preferences)
  const initialPreferences = readPreferences('en')
  const i18n = await createI18n(initialPreferences.language)
  await runStorageAction('restore', () => root.render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <App initialPreferences={initialPreferences} />
      </I18nextProvider>
    </StrictMode>,
  ))
}

function button(text: string, container: ParentNode = document): HTMLButtonElement {
  const match = Array.from(container.querySelectorAll('button')).find((item) => item.textContent?.trim() === text)
  if (!match) throw new Error(`Button not found: ${text}`)
  return match
}

function click(element: HTMLButtonElement) {
  act(() => element.click())
}

function openDialog(): HTMLDialogElement {
  const dialog = document.querySelector<HTMLDialogElement>('dialog[open]')
  if (!dialog) throw new Error('Expected an open import dialog')
  return dialog
}

async function selectFile(name: string, contents: string) {
  const input = openDialog().querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('CSV file input not found')
  const selection = new DataTransfer()
  selection.items.add(new File([contents], name, { type: 'text/csv' }))
  input.files = selection.files
  act(() => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await act(async () => pendingParse)
}

it('offers the same welcome screen from either view and opens Data View after a confirmed upload', async () => {
  await renderApp({ language: 'en', theme: 'dark', view: 'dashboard' })

  expect(button('Dashboard View').getAttribute('aria-pressed')).toBe('true')
  expect(button('Export CSV').disabled).toBe(true)
  expect(document.querySelector('h1')?.textContent).toBe('Welcome to CSV Analytics Studio')
  const demo = Array.from(document.querySelectorAll<HTMLButtonElement>('main button')).find((item) => item.textContent?.includes('Try demo data'))
  expect(demo?.disabled).toBe(true)
  expect(demo?.textContent).toContain('Coming soon')
  click(button('Data View'))
  expect(document.querySelector('h1')?.textContent).toBe('Welcome to CSV Analytics Studio')
  click(button('Dashboard View'))

  click(button('Upload CSV'))
  expect(button('Confirm import', openDialog()).disabled).toBe(true)
  await selectFile('first.csv', 'ID,ID,Note\n00123,')
  expect(openDialog().querySelector('tbody')?.textContent).toContain('00123')
  expect(button('Dashboard View').getAttribute('aria-pressed')).toBe('true')
  await runStorageAction('save', () => button('Confirm import', openDialog()).click())

  expect(document.querySelector('dialog')).toBeNull()
  expect(document.querySelector('h1')?.textContent).toBe('Data View')
  expect(document.querySelector('main [role="status"]')?.textContent).toContain('Imported: first.csv')
  expect(document.querySelector('main [role="status"]')?.textContent).toContain('Rows: 1 · Columns: 3')
  expect(Array.from(document.querySelectorAll('main thead th'), (cell) => cell.textContent)).toEqual(['#1ID', '#2ID', '#3Note'])
  expect(Array.from(document.querySelectorAll('main tbody td'), (cell) => cell.textContent)).toEqual(['00123', 'Empty', 'Missing field'])
  expect(readPreferences('ru')).toEqual({ language: 'en', theme: 'dark', view: 'data' })
})

it('lets users cancel, save another dataset, switch, and confirm deletion without losing the other dataset', async () => {
  await renderApp({ language: 'ru', theme: 'light', view: 'data' })

  expect(document.querySelector('h1')?.textContent).toBe('Добро пожаловать в CSV Analytics Studio')
  expect(document.querySelector('main button:disabled')?.textContent).toContain('Скоро')
  click(button('Импорт CSV'))
  await selectFile('first.csv', 'ID,Name\n00123,Example')
  await runStorageAction('save', () => button('Подтвердить импорт', openDialog()).click())
  click(button('Дашборд'))

  click(button('Импорт CSV'))
  await selectFile('second.csv', 'ID,Name\n00124,Example\n00125,Another')
  click(button('Отмена', openDialog()))
  expect(button('Дашборд').getAttribute('aria-pressed')).toBe('true')
  click(button('Данные'))
  expect(document.querySelector('main [role="status"]')?.textContent).toContain('first.csv')

  click(button('Дашборд'))
  click(button('Импорт CSV'))
  expect(button('Подтвердить импорт', openDialog()).disabled).toBe(true)
  await selectFile('second.csv', 'ID,Name\n00124,Example\n00125,Another')
  await runStorageAction('save', () => button('Подтвердить импорт', openDialog()).click())
  expect(button('Данные').getAttribute('aria-pressed')).toBe('true')
  expect(document.querySelector('main [role="status"]')?.textContent).toContain('Импортирован файл second.csv')
  expect(document.querySelector('main [role="status"]')?.textContent).toContain('Строки: 2 · Столбцы: 2')
  expect(readPreferences('en')).toEqual({ language: 'ru', theme: 'light', view: 'data' })

  const picker = document.querySelector<HTMLSelectElement>('main select')!
  const first = Array.from(picker.options).find((option) => option.text === 'first.csv')!
  expect(picker.options).toHaveLength(2)
  await runStorageAction('select', () => {
    picker.value = first.value
    picker.dispatchEvent(new Event('change', { bubbles: true }))
  })
  expect(document.querySelector('main [role="status"]')?.textContent).toContain('Активный набор: first.csv')

  click(button('Удалить набор'))
  expect(picker.options).toHaveLength(2)
  expect(document.querySelector('main')?.textContent).toContain('Удалить «first.csv»')
  await runStorageAction('remove', () => button('Подтвердить удаление').click())
  expect(Array.from(picker.options, (option) => option.text)).toEqual(['second.csv'])
  expect(document.querySelector('main [role="status"]')?.textContent).toContain('second.csv')
})

it('keeps the preview open and lets users retry when browser storage rejects an import', async () => {
  await renderApp({ language: 'en', theme: 'light', view: 'data' })
  click(button('Upload CSV'))
  await selectFile('retry.csv', 'ID,Name\n00123,Example')

  const save = vi.spyOn(datasetStorage, 'save').mockRejectedValueOnce(new DOMException('Storage full', 'QuotaExceededError'))
  await act(async () => button('Confirm import', openDialog()).click())

  expect(openDialog().querySelector('[role="alert"]')?.textContent).toContain('The dataset could not be saved')
  expect(openDialog().querySelector('tbody')?.textContent).toContain('00123')
  expect((await datasetStorage.restore()).datasets).toHaveLength(0)

  save.mockRestore()
  await runStorageAction('save', () => button('Confirm import', openDialog()).click())
  expect(document.querySelector('dialog')).toBeNull()
  expect(document.querySelector('main [role="status"]')?.textContent).toContain('Imported: retry.csv')
})

it('paginates loaded rows at every supported size and resets the page when another dataset is selected', async () => {
  const first = await datasetStorage.save({
    name: 'short.csv',
    options: { delimiter: ',', encoding: 'utf-8', hasHeaders: true },
    columns: [{ id: 'column-1', header: 'Code' }],
    rows: [['09000']],
  })
  await datasetStorage.save({
    name: 'long.csv',
    options: { delimiter: ',', encoding: 'utf-8', hasHeaders: true },
    columns: [{ id: 'column-1', header: 'Code' }],
    rows: Array.from({ length: 106 }, (_, index) => [String(index + 1).padStart(5, '0')]),
  })
  await renderApp({ language: 'en', theme: 'light', view: 'data' })

  const rows = () => document.querySelectorAll('main tbody tr')
  const firstCell = () => document.querySelector('main tbody td')?.textContent
  const page = () => document.querySelector('main nav [role="status"]')?.textContent
  const pageSize = document.querySelector<HTMLSelectElement>('main nav select')!
  const changePageSize = (size: string) => act(() => {
    pageSize.value = size
    pageSize.dispatchEvent(new Event('change', { bubbles: true }))
  })

  expect(rows()).toHaveLength(25)
  expect(firstCell()).toBe('00001')
  expect(page()).toBe('Page 1 of 5')
  expect(button('First').disabled).toBe(true)
  expect(button('Previous').disabled).toBe(true)

  const lookup = vi.spyOn(datasetStorage.rows, 'where')
  click(button('Next'))
  expect(firstCell()).toBe('00026')
  expect(page()).toBe('Page 2 of 5')
  changePageSize('50')
  expect(rows()).toHaveLength(50)
  expect(page()).toBe('Page 1 of 3')
  click(button('Next'))
  expect(firstCell()).toBe('00051')
  click(button('Previous'))
  expect(firstCell()).toBe('00001')

  changePageSize('100')
  expect(rows()).toHaveLength(100)
  click(button('Last'))
  expect(rows()).toHaveLength(6)
  expect(firstCell()).toBe('00101')
  expect(page()).toBe('Page 2 of 2')
  expect(button('Next').disabled).toBe(true)
  expect(button('Last').disabled).toBe(true)
  click(button('First'))
  expect(firstCell()).toBe('00001')
  click(button('Next'))
  expect(lookup).not.toHaveBeenCalled()
  lookup.mockRestore()

  const picker = document.querySelector<HTMLSelectElement>('main select')!
  await runStorageAction('select', () => {
    picker.value = String(first.activeDataset?.id)
    picker.dispatchEvent(new Event('change', { bubbles: true }))
  })
  expect(firstCell()).toBe('09000')
  expect(page()).toBe('Page 1 of 1')
  expect(document.querySelector<HTMLSelectElement>('main nav select')?.value).toBe('100')
})

it('keeps headers visible and disables navigation when the dataset has no rows', async () => {
  await datasetStorage.save({
    name: 'headers.csv',
    options: { delimiter: ',', encoding: 'utf-8', hasHeaders: true },
    columns: [{ id: 'column-1', header: 'Code' }],
    rows: [],
  })
  await renderApp({ language: 'ru', theme: 'dark', view: 'data' })

  expect(document.querySelector('main thead th')?.textContent).toBe('#1Code')
  expect(document.querySelectorAll('main tbody tr')).toHaveLength(0)
  expect(document.querySelector('main nav [role="status"]')?.textContent).toBe('Страница 0 из 0')
  expect(document.querySelector('main')?.textContent).toContain('В файле есть заголовки столбцов, но нет строк данных.')
  expect(button('Назад').disabled).toBe(true)
  expect(button('Вперёд').disabled).toBe(true)
})

async function renderEditableDataset() {
  const { activeDataset } = await datasetStorage.save({
    name: 'editable.csv',
    options: { delimiter: ',', encoding: 'utf-8', hasHeaders: true },
    columns: [{ id: 'column-1', header: 'Code' }, { id: 'column-2', header: 'Note' }],
    rows: [['original', 'to clear'], ['another', null]],
  })
  await renderApp({ language: 'en', theme: 'light', view: 'data' })
  return activeDataset!
}

function editCell(index: number, value?: string): HTMLTextAreaElement {
  const cell = document.querySelectorAll('main tbody td')[index]
  act(() => {
    cell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, detail: 2 }))
  })
  const editor = cell.querySelector('textarea')!
  expect(document.activeElement).toBe(editor)
  if (value !== undefined) {
    const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
    act(() => {
      setValue.call(editor, value)
      editor.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }
  return editor
}

function pressKey(editor: HTMLTextAreaElement, key: string) {
  editor.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

it('saves text on Enter and an empty string on blur while Escape leaves the saved data intact', async () => {
  const dataset = await renderEditableDataset()
  const first = editCell(0, '00123')
  await runStorageAction('updateCell', () => pressKey(first, 'Enter'))
  expect(document.querySelector('main tbody td')?.textContent).toBe('00123')

  const cancelled = editCell(0, 'discard this')
  const update = vi.spyOn(datasetStorage, 'updateCell')
  act(() => pressKey(cancelled, 'Escape'))
  expect(document.querySelector('main tbody td')?.textContent).toBe('00123')

  const missing = editCell(3)
  act(() => missing.blur())
  expect(update).not.toHaveBeenCalled()
  update.mockRestore()

  const second = editCell(1, '')
  await runStorageAction('updateCell', () => second.blur())
  expect(document.querySelectorAll('main tbody td')[1].textContent).toBe('Empty')
  expect(await datasetStorage.datasets.get(dataset.id)).toMatchObject({ revision: 3 })
  expect(await datasetStorage.rows.get([dataset.id, 1])).toMatchObject({
    values: { 'column-1': '00123', 'column-2': '' },
  })
  expect(await datasetStorage.rows.get([dataset.id, 2])).toMatchObject({
    values: { 'column-1': 'another', 'column-2': null },
  })
})

it('shows progress and keeps the last saved value if the cell write fails', async () => {
  const dataset = await renderEditableDataset()
  const editor = editCell(0, 'uncommitted')
  let rejectWrite!: (error: Error) => void
  const write = new Promise<never>((_, reject) => { rejectWrite = reject })
  vi.spyOn(datasetStorage, 'updateCell').mockReturnValueOnce(write)

  act(() => pressKey(editor, 'Enter'))
  expect(document.querySelector('main [role="status"]')?.textContent).toContain('Saving cell change')
  expect(document.querySelector('main tbody td')?.textContent).toBe('original')

  await act(async () => {
    rejectWrite(new Error('Write failed'))
    await write.catch(() => undefined)
  })
  expect(document.querySelector('main [role="alert"]')?.textContent).toContain('The cell change could not be saved')
  expect(document.querySelector('main tbody td')?.textContent).toBe('original')
  expect(await datasetStorage.datasets.get(dataset.id)).toMatchObject({ revision: 1 })
})

it('exports edited values in UTF-8, requires explicit consent without protection, and leaves IndexedDB intact', async () => {
  await renderEditableDataset()
  const code = editCell(0, '00123')
  await runStorageAction('updateCell', () => pressKey(code, 'Enter'))
  const note = editCell(1, '=a,"b"\nМир')
  await runStorageAction('updateCell', () => pressKey(note, 'Enter'))
  const before = await datasetStorage.restore()

  const urls = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:csv-test')
  let filename = ''
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    filename = this.download
  })

  click(button('Dashboard View'))
  click(button('Export CSV'))
  await act(async () => pendingExport)
  let dialog = openDialog()
  const protection = dialog.querySelector<HTMLInputElement>('input[type="checkbox"]')!
  expect(protection.checked).toBe(true)
  expect(dialog.textContent).toContain('Fields that protection will modify: 1.')
  click(button('Download CSV', dialog))
  await act(async () => pendingExport)

  const bytes = await (urls.mock.calls[0][0] as Blob).arrayBuffer()
  expect(Array.from(new Uint8Array(bytes).slice(0, 3))).toEqual([0xef, 0xbb, 0xbf])
  const protectedCsv = new TextDecoder().decode(bytes)
  expect(filename).toBe('editable_edited.csv')
  expect(Papa.parse<string[]>(protectedCsv).data[1]).toEqual(['00123', `'=a,"b"\nМир`])

  click(button('Export CSV'))
  await act(async () => pendingExport)
  dialog = openDialog()
  act(() => dialog.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click())
  expect(dialog.textContent).toContain('Fields that protection will modify: 0.')
  expect(dialog.querySelector('[role="alert"]')?.textContent).toContain('interpret these values as formulas')
  expect(button('Download CSV', dialog).disabled).toBe(true)
  act(() => dialog.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')[1].click())
  expect(button('Download CSV', dialog).disabled).toBe(false)
  click(button('Download CSV', dialog))
  await act(async () => pendingExport)

  const unprotectedBytes = await (urls.mock.calls[1][0] as Blob).arrayBuffer()
  expect(Papa.parse<string[]>(new TextDecoder().decode(unprotectedBytes)).data[1]).toEqual(['00123', '=a,"b"\nМир'])
  expect(await datasetStorage.restore()).toEqual(before)
})

it('keeps the export dialog open and shows an error if creating the download fails', async () => {
  await renderEditableDataset()
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => { throw new Error('Download failed') })
  click(button('Export CSV'))
  await act(async () => pendingExport)
  click(button('Download CSV', openDialog()))
  await act(async () => pendingExport)
  expect(openDialog().querySelector('[role="alert"]')?.textContent).toContain('The CSV download could not be started')
  click(button('Cancel', openDialog()))
  expect(document.querySelector('dialog')).toBeNull()
})

it('shows a worker startup failure and retries export without writing to IndexedDB', async () => {
  await renderEditableDataset()
  const before = await datasetStorage.restore()
  const workingWorker = globalThis.Worker
  vi.stubGlobal('Worker', class {
    constructor() { throw new Error('Worker unavailable') }
  })

  click(button('Export CSV'))
  expect(openDialog().querySelector('[role="alert"]')?.textContent).toContain('The CSV download could not be started')
  expect(button('Download CSV', openDialog()).disabled).toBe(true)

  vi.stubGlobal('Worker', workingWorker)
  click(button('Retry export', openDialog()))
  await act(async () => pendingExport)
  expect(button('Download CSV', openDialog()).disabled).toBe(false)
  expect(openDialog().querySelector('[role="alert"]')).toBeNull()
  click(button('Cancel', openDialog()))
  expect(await datasetStorage.restore()).toEqual(before)
})
