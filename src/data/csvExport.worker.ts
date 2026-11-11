import { datasetStorage } from '../storage/datasetStorage'
import { prepareCsvExport, serializeCsv } from './csvExport'
import type { CsvExportRequest, CsvExportResponse } from './csvExport'

let prepared: ReturnType<typeof prepareCsvExport> | null = null

self.addEventListener('message', async ({ data }: MessageEvent<CsvExportRequest>) => {
  let response: CsvExportResponse
  try {
    if (data.type === 'prepare') {
      prepared = null
      const dataset = await datasetStorage.readDataset(data.datasetId, data.revision)
      prepared = prepareCsvExport(dataset)
      response = {
        type: 'prepared',
        filename: prepared.filename,
        affectedFields: prepared.affectedFields,
        missingFields: prepared.missingFields,
      }
    } else {
      if (!prepared) throw new Error('CSV export is not ready')
      const csv = serializeCsv(prepared, data.protect)
      response = {
        type: 'serialized',
        filename: prepared.filename,
        blob: new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }),
      }
    }
  } catch {
    response = { type: 'error' }
  }
  self.postMessage(response)
})
