import { describe, expect, it } from 'vitest'
import { parseCsv } from './csvImport'
import type { CsvImportOptions } from './csvImport'

const defaultCsvImportOptions: CsvImportOptions = { delimiter: 'auto', hasHeaders: true, encoding: 'utf-8' }

function parse(text: string, options: Partial<CsvImportOptions> = {}) {
  return parseCsv('test.csv', new TextEncoder().encode(text).buffer, { ...defaultCsvImportOptions, ...options })
}

describe('CSV import', () => {
  it('preserves text values, quoted delimiters, escaped quotes and multiline fields', () => {
    const result = parse('\uFEFFID,Note\r\n00123,"a,b"\r\n00004,"He said ""hi""\r\nthen left"\r\n')
    expect(result).toMatchObject({
      ok: true,
      dataset: {
        options: { delimiter: ',' },
        columns: [{ header: 'ID' }, { header: 'Note' }],
        rows: [['00123', 'a,b'], ['00004', 'He said "hi"\r\nthen left']],
      },
    })
  })

  it.each([';', '\t'] as const)('detects separator %j and keeps the first record when headers are disabled', (delimiter) => {
    const result = parse(`00123${delimiter}first\n00456${delimiter}second\n`, { hasHeaders: false })
    expect(result).toMatchObject({
      ok: true,
      dataset: {
        options: { delimiter, hasHeaders: false },
        columns: [{ header: null }, { header: null }],
        rows: [['00123', 'first'], ['00456', 'second']],
      },
      warnings: { delimiterFallback: false },
    })
  })

  it('uses the manually selected separator for ambiguous input', () => {
    expect(parse('id;note\n00123;one,two', { delimiter: ';' })).toMatchObject({
      ok: true,
      dataset: { rows: [['00123', 'one,two']] },
    })
  })

  it('reports a fallback for a valid single-column file', () => {
    expect(parse('id\n00123')).toMatchObject({
      ok: true,
      dataset: { rows: [['00123']] },
      warnings: { delimiterFallback: true },
    })
  })

  it('retains duplicate and blank headers, extra fields and missing cells', () => {
    expect(parse('id,id,\n00123,\n4,5,,extra', { delimiter: ',' })).toMatchObject({
      ok: true,
      dataset: {
        columns: [
          { id: 'column-1', header: 'id' },
          { id: 'column-2', header: 'id' },
          { id: 'column-3', header: '' },
          { id: 'column-4', header: null },
        ],
        rows: [['00123', '', null, null], ['4', '5', '', 'extra']],
      },
      warnings: { unevenRows: 2, duplicateHeaders: 1, blankHeaders: 1 },
    })
  })

  it('keeps blank records and whitespace in cells while ignoring the terminal line separator', () => {
    expect(parse('id,value\n\n00123,  \n\n', { delimiter: ',' })).toMatchObject({
      ok: true,
      dataset: { rows: [['', null], ['00123', '  '], ['', null]] },
    })
  })

  it('allows headers without data', () => {
    expect(parse('ID,Name\n')).toMatchObject({
      ok: true,
      dataset: { columns: [{ header: 'ID' }, { header: 'Name' }], rows: [] },
    })
  })

  it.each(['', '\uFEFF', '\r\n\r\n'])('rejects empty input %j', (text) => {
    expect(parse(text)).toEqual({ ok: false, error: { code: 'empty' } })
  })

  it.each(['ID,Name\n1,"Alice', 'ID,Name\n1,"Alice"x\n'])('reports broken quotes with a record number', (text) => {
    expect(parse(text)).toEqual({ ok: false, error: { code: 'quotes', record: 2 } })
  })

  it('decodes Windows-1251 without replacing invalid UTF-8 bytes silently', () => {
    const bytes = Uint8Array.from([0xe8, 0xec, 0xff, 0x0a, 0xcc, 0xe8, 0xf0]).buffer

    expect(parseCsv('test.csv', bytes, defaultCsvImportOptions)).toEqual({
      ok: false,
      error: { code: 'encoding' },
    })
    expect(parseCsv('test.csv', bytes, { ...defaultCsvImportOptions, encoding: 'windows-1251' })).toMatchObject({
      ok: true,
      dataset: { columns: [{ header: 'имя' }], rows: [['Мир']] },
    })
  })
})
