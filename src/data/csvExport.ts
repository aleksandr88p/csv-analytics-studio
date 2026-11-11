import Papa from 'papaparse'
import type { StoredDataset } from '../storage/datasetStorage'

// Use the same expression for the preview count and Papa Parse's escaping.
// Spreadsheet readers can ignore leading whitespace or control characters.
const formulaPrefix = /^[\s\u0000-\u001f\u007f-\u009f]*[=+\-@\t\r\n＝＋－＠]/u

export type CsvExportRequest =
  | { type: 'prepare'; datasetId: number; revision: number }
  | { type: 'serialize'; protect: boolean }

export type CsvExportResponse =
  | { type: 'prepared'; filename: string; affectedFields: number; missingFields: number }
  | { type: 'serialized'; blob: Blob; filename: string }
  | { type: 'error' }

interface PreparedCsvExport {
  records: string[][]
  delimiter: string
  filename: string
  affectedFields: number
  missingFields: number
}

export function prepareCsvExport(dataset: StoredDataset): PreparedCsvExport {
  const records: string[][] = []
  let missingFields = 0
  if (dataset.options.hasHeaders) {
    records.push(dataset.columns.map((column) => column.header ?? ''))
  }
  const orderedRows = [...dataset.rows].sort((left, right) => left.order - right.order)
  for (const row of orderedRows) {
    records.push(dataset.columns.map((column) => {
      const value = row.values[column.id]
      if (value === null || value === undefined) missingFields++
      return value ?? ''
    }))
  }

  let affectedFields = 0
  for (const record of records) {
    for (const value of record) {
      if (formulaPrefix.test(value)) affectedFields++
    }
  }

  return {
    records,
    delimiter: dataset.options.delimiter,
    filename: `${dataset.name.replace(/\.csv$/i, '') || 'dataset'}_edited.csv`,
    affectedFields,
    missingFields,
  }
}

export function serializeCsv(prepared: PreparedCsvExport, protect: boolean): string {
  return Papa.unparse(prepared.records, {
    delimiter: prepared.delimiter,
    newline: '\r\n',
    quotes: true,
    skipEmptyLines: false,
    escapeFormulae: protect ? formulaPrefix : false,
  })
}
