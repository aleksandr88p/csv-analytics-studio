import { parseCsv } from './csvImport'
import type { CsvImportOptions, CsvImportResult } from './csvImport'

self.addEventListener('message', async ({ data }: MessageEvent<{ file: File; options: CsvImportOptions }>) => {
  let result: CsvImportResult
  try {
    const { file, options } = data
    result = parseCsv(file.name, await file.arrayBuffer(), options)
  } catch {
    result = { ok: false, error: { code: 'read' } }
  }
  self.postMessage(result)
})
