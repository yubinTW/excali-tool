import { NonDeletedExcalidrawElement } from '../element/types'

export type ExportedElements = readonly NonDeletedExcalidrawElement[] & {
  _brand: 'exportedElements'
}
