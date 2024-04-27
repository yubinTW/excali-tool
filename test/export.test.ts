import { describe, expect, test } from 'vitest'
import { ExportOpts, exportToBuffer, exportToSvg } from '../src/utils/export'
import { ExcalidrawElementSkeleton, convertToExcalidrawElements } from '../src/data/transform'
import fs from 'fs'
import { createCanvas } from '@napi-rs/canvas'
import { Canvg, RenderingContext2D } from 'canvg'

describe('exportToBuffer', () => {
  test('should return Buffer', async () => {
    const rawData: Array<ExcalidrawElementSkeleton> = [
      {
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        strokeColor: '#FF0000',
        index: null
      },
      {
        type: 'rectangle',
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        strokeColor: '#00FF00',
        index: null
      },
      {
        type: 'text',
        x: 100,
        y: 100,
        text: 'Hello world',
        fontSize: 50,
        fontFamily: 1,
        strokeColor: '#0000FF'
      }
    ]
    const convertedElements = convertToExcalidrawElements(rawData)
    const opts: ExportOpts = {
      elements: convertedElements,
      files: {},
      appState: { exportBackground: false, exportEmbedScene: true }
    }

    const canvas = createCanvas(1, 1)
    const ctx = canvas.getContext('2d')
    const svg = await exportToSvg({ ...opts })
    const canvg = Canvg.fromString(ctx as unknown as RenderingContext2D, svg.outerHTML)
    await canvg.render()
    const exportType = 'png'
    const buffer = canvas.toBuffer(`image/${exportType}`)

    expect(buffer).toBeInstanceOf(Buffer)
    // fs.writeFileSync(`test.${exportType}`, buffer)
  })
})
