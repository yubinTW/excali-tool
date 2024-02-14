// -----------------------------------------------------------------------------
// ExcalidrawImageElement & related helpers
// -----------------------------------------------------------------------------

import { DataURL } from '../types'
import { isInitializedImageElement } from './typeChecks'
import { ExcalidrawElement, InitializedExcalidrawImageElement } from './types'

export const loadHTMLImageElement = (dataURL: DataURL) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      resolve(image)
    }
    image.onerror = (error) => {
      reject(error)
    }
    image.src = dataURL
  })
}

export const getInitializedImageElements = (elements: readonly ExcalidrawElement[]) =>
  elements.filter((element) => isInitializedImageElement(element)) as InitializedExcalidrawImageElement[]

export const isHTMLSVGElement = (node: Node | null): node is SVGElement => {
  // lower-casing due to XML/HTML convention differences
  // https://johnresig.com/blog/nodename-case-sensitivity
  return node?.nodeName.toLowerCase() === 'svg'
}
