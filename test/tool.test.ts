import { describe, expect, it, test } from 'vitest'

import { ExcalidrawElementSkeleton } from '../src/data/transform'
import { convertToExcalidrawElements, generateIdFromDataUrl } from '../src/index'

describe('Tool Testing', () => {
  describe('convertToExcalidrawElements() test', () => {
    it('should convert ExcalidrawElementSkeleton to ExcalidrawElement', () => {
      const rawData: Array<ExcalidrawElementSkeleton> = [
        {
          type: 'text',
          x: 100,
          y: 100,
          text: 'Hello world',
          fontSize: 20,
          fontFamily: 1,
          customData: {
            createdBy: 'user1'
          }
        }
      ]
      const convertedElements = convertToExcalidrawElements(rawData)
      expect(convertedElements).toHaveLength(1)
      expect(convertedElements[0]).toHaveProperty('id')
    })
  })

  describe('generateIdFromDataUrl() test', () => {
    test('should generate fileId with 40 chars', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAABjElEQVRIS+2Uz0oDQRSGv'
      const hash = generateIdFromDataUrl(dataUrl)
      expect(hash).toHaveLength(40)
    })

    test('with the same dataUrl should generate the same fileId', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAABjElEQVRIS+2Uz0oDQRSGv'
      const hash1 = generateIdFromDataUrl(dataUrl)
      const hash2 = generateIdFromDataUrl(dataUrl)
      expect(hash1).toBe(hash2)
    })
  })
})
