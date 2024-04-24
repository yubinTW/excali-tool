import { describe, expect, test } from 'vitest'
import { ExportOpts, exportToBuffer } from '../src/utils/export'

describe('exportToBuffer', () => {
  test('should return Buffer', async () => {
    const opts: ExportOpts = {
      elements: [],
      files: {},
      appState: { exportBackground: false }
    }
    const result = await exportToBuffer({ ...opts, mimeType: 'image/png' })
    expect(result).toBeInstanceOf(Buffer)
  })
})
