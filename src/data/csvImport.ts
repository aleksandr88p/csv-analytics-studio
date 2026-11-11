import Papa from 'papaparse'

export const csvDelimiters = [',', ';', '\t'] as const
export type CsvDelimiter = (typeof csvDelimiters)[number]
export type CsvEncoding = 'utf-8' | 'windows-1251'

export interface CsvImportOptions {
  delimiter: CsvDelimiter | 'auto'
  hasHeaders: boolean
  encoding: CsvEncoding
}

export interface CsvDataset {
  name: string
  options: CsvImportOptions & { delimiter: CsvDelimiter }
  columns: { id: string; header: string | null }[]
  rows: (string | null)[][]
}

type CsvImportError =
  | { code: 'empty' | 'encoding' | 'read' }
  | { code: 'quotes'; record?: number }

export type CsvImportResult =
  | { ok: false; error: CsvImportError }
  | {
      ok: true
      dataset: CsvDataset
      warnings: {
        delimiterFallback: boolean
        unevenRows: number
        duplicateHeaders: number
        blankHeaders: number
      }
    }

export function parseCsv(name: string, bytes: ArrayBuffer, options: CsvImportOptions): CsvImportResult {
  let text: string
  try {
    text = new TextDecoder(options.encoding, { fatal: true }).decode(bytes)
  } catch {
    return { ok: false, error: { code: 'encoding' } }
  }

  if (/^[\r\n]*$/.test(text)) return { ok: false, error: { code: 'empty' } }

  let delimiter = options.delimiter
  if (delimiter === 'auto') {
    // Empty records skew Papa Parse's separator guess for short files.
    const sample = Papa.parse<string[]>(text, {
      delimitersToGuess: [...csvDelimiters],
      skipEmptyLines: true,
      preview: 1,
    })
    if (!sample.errors.some((error) => error.code === 'UndetectableDelimiter')) {
      delimiter = csvDelimiters.find((candidate) => candidate === sample.meta.delimiter) ?? 'auto'
    }
  }

  const delimiterFallback = delimiter === 'auto'
  const actualDelimiter = delimiter === 'auto' ? ',' : delimiter
  const { data, errors, meta } = Papa.parse<string[]>(text, {
    delimiter: actualDelimiter,
    header: false,
    dynamicTyping: false,
    skipEmptyLines: false,
  })

  const quoteError = errors.find((error) => error.type === 'Quotes')
  if (quoteError) {
    const record = quoteError.row === undefined ? undefined : quoteError.row + 1
    return { ok: false, error: { code: 'quotes', record } }
  }

  // Papa Parse reports an extra empty record after the final line separator.
  if (text.endsWith(meta.linebreak)) data.pop()

  const headers = options.hasHeaders ? data.shift() ?? [] : []
  const expectedWidth = options.hasHeaders ? headers.length : (data[0]?.length ?? 0)
  let width = expectedWidth
  let unevenRows = 0
  for (const row of data) {
    width = Math.max(width, row.length)
    if (row.length !== expectedWidth) unevenRows++
  }

  const seenHeaders = new Set<string>()
  let duplicateHeaders = 0
  let blankHeaders = 0
  const columns = Array.from({ length: width }, (_, index) => {
    const header = headers[index] ?? null
    if (header !== null) {
      if (header.trim() === '') blankHeaders++
      else if (seenHeaders.has(header)) duplicateHeaders++
      seenHeaders.add(header)
    }
    return { id: `column-${index + 1}`, header }
  })

  return {
    ok: true,
    dataset: {
      name,
      options: { ...options, delimiter: actualDelimiter },
      columns,
      rows: data.map((row) => Array.from({ length: width }, (_, index) => row[index] ?? null)),
    },
    warnings: {
      delimiterFallback,
      unevenRows,
      duplicateHeaders,
      blankHeaders,
    },
  }
}
