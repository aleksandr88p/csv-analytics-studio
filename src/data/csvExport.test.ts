import Papa from 'papaparse'
import { expect, it } from 'vitest'
import type { StoredDataset } from '../storage/datasetStorage'
import { prepareCsvExport, serializeCsv } from './csvExport'

function dataset(values: (string | null)[][]): StoredDataset {
  return {
    id: 1,
    name: 'employees.CSV',
    revision: 2,
    rowCount: values.length,
    options: { delimiter: ',', encoding: 'utf-8', hasHeaders: true },
    columns: [
      { id: 'stable-id', header: 'Code' },
      { id: 'other-id', header: 'Code' },
    ],
    rows: values.map((row, index) => ({
      datasetId: 1,
      rowId: index + 1,
      order: index,
      values: { 'stable-id': row[0], 'other-id': row[1] },
    })),
  }
}

function parse(text: string, delimiter = ',') {
  return Papa.parse<string[]>(text, { delimiter, dynamicTyping: false, skipEmptyLines: false }).data
}

it('keeps original row and column order, duplicate headers, empty values and exact text', () => {
  const source = dataset([
    ['00123', 'a,"quote"\r\nnext line'],
    ['', '  spaces  '],
    ['00004', ''],
  ])
  source.rows.reverse()
  const before = structuredClone(source)
  const prepared = prepareCsvExport(source)
  expect(prepared.filename).toBe('employees_edited.csv')
  expect(parse(serializeCsv(prepared, true))).toEqual([
    ['Code', 'Code'],
    ['00123', 'a,"quote"\r\nnext line'],
    ['', '  spaces  '],
    ['00004', ''],
  ])
  expect(source).toEqual(before)
})

it.each(['=', '+', '-', '@', '\t', '\r', '\n', '＝', '＋', '－', '＠'])('counts and protects headers and multiline fields starting with %j', (prefix) => {
  const source = dataset([[`${prefix}value\nnext`, '00123']])
  source.columns[0].header = `${prefix}header`
  const prepared = prepareCsvExport(source)
  expect(prepared.affectedFields).toBe(2)
  expect(parse(serializeCsv(prepared, true))).toEqual([
    [`'${prefix}header`, 'Code'],
    [`'${prefix}value\nnext`, '00123'],
  ])
  expect(parse(serializeCsv(prepared, false))).toEqual([
    [`${prefix}header`, 'Code'],
    [`${prefix}value\nnext`, '00123'],
  ])
})

it('does not prefix safe values or an existing apostrophe', () => {
  const prepared = prepareCsvExport(dataset([["'=1+1", '00123'], ['text=1', '']]))
  expect(prepared.affectedFields).toBe(0)
  expect(serializeCsv(prepared, true)).toBe(serializeCsv(prepared, false))
})

it('retains the source separator, blanks and generated header slots', () => {
  const source = dataset([['00123', null]])
  source.options.delimiter = ';'
  source.columns[1].header = null
  const prepared = prepareCsvExport(source)
  expect(prepared.missingFields).toBe(1)
  expect(parse(serializeCsv(prepared, true), ';')).toEqual([['Code', ''], ['00123', '']])
})

it('adds no header record to a dataset imported without headers', () => {
  const source = dataset([['00123', ''], ['', '']])
  source.options.hasHeaders = false
  source.columns[0].header = '=not-exported'
  const prepared = prepareCsvExport(source)
  expect(prepared.affectedFields).toBe(0)
  expect(parse(serializeCsv(prepared, true))).toEqual([['00123', ''], ['', '']])
})

it('exports column headers even when the dataset has no rows', () => {
  expect(parse(serializeCsv(prepareCsvExport(dataset([])), true))).toEqual([['Code', 'Code']])
})

it.each([
  ' ', '   ', '\t', ' \t ', '\n', '\r', '\u0000', '\u0001', '\u0008',
  '\u000b', '\u000c', '\u001f', '\u007f', '\u0085', '\u009f', '\u00a0', '\uFEFF', ' \u0000\t',
])('protects formula signs behind leading whitespace or controls %j without trimming values', (leading) => {
  for (const sign of ['=', '+', '-', '@', '＝', '＋', '－', '＠']) {
    const value = `${leading}${sign}1+1`
    const source = dataset([[value, '00123']])
    source.columns[0].header = value
    const before = structuredClone(source)
    const prepared = prepareCsvExport(source)
    expect(prepared.affectedFields).toBe(2)
    expect(parse(serializeCsv(prepared, true))).toEqual([[`'${value}`, 'Code'], [`'${value}`, '00123']])
    expect(parse(serializeCsv(prepared, false))).toEqual([[value, 'Code'], [value, '00123']])
    expect(source).toEqual(before)
  }
})

it('does not escape ordinary indented text, spaces or text with a formula sign inside', () => {
  const values = [['  safe', '  00123'], [' ', 'a=1'], ['\u0000text=1', "  '=1"]]
  const prepared = prepareCsvExport(dataset(values))
  expect(prepared.affectedFields).toBe(0)
  expect(parse(serializeCsv(prepared, true)).slice(1)).toEqual(values)
})
