import { NonDeletedExcalidrawElement } from '../element/types'
import { ElementOrToolType } from '../types'

export const hasBackground = (type: ElementOrToolType) =>
  type === 'rectangle' ||
  type === 'embeddable' ||
  type === 'ellipse' ||
  type === 'diamond' ||
  type === 'line' ||
  type === 'freedraw'

export const hasStrokeColor = (type: ElementOrToolType) => type !== 'image' && type !== 'frame' && type !== 'magicframe'

export const hasStrokeWidth = (type: ElementOrToolType) =>
  type === 'rectangle' ||
  type === 'embeddable' ||
  type === 'ellipse' ||
  type === 'diamond' ||
  type === 'freedraw' ||
  type === 'arrow' ||
  type === 'line'

export const hasStrokeStyle = (type: ElementOrToolType) =>
  type === 'rectangle' ||
  type === 'embeddable' ||
  type === 'ellipse' ||
  type === 'diamond' ||
  type === 'arrow' ||
  type === 'line'

export const canChangeRoundness = (type: ElementOrToolType) =>
  type === 'rectangle' ||
  type === 'embeddable' ||
  type === 'arrow' ||
  type === 'line' ||
  type === 'diamond' ||
  type === 'image'

export const canHaveArrowheads = (type: ElementOrToolType) => type === 'arrow'

export const getElementAtPosition = (
  elements: readonly NonDeletedExcalidrawElement[],
  isAtPositionFn: (element: NonDeletedExcalidrawElement) => boolean
) => {
  let hitElement = null
  // We need to to hit testing from front (end of the array) to back (beginning of the array)
  // because array is ordered from lower z-index to highest and we want element z-index
  // with higher z-index
  for (let index = elements.length - 1; index >= 0; --index) {
    const element = elements[index]
    if (element.isDeleted) {
      continue
    }
    if (isAtPositionFn(element)) {
      hitElement = element
      break
    }
  }

  return hitElement
}
