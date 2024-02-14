import { updateBoundElements } from './binding'
import { Bounds, getCommonBounds } from './bounds'
import { mutateElement } from './mutateElement'
import { getPerfectElementSize } from './sizeHelpers'
import { NonDeletedExcalidrawElement } from './types'
import { AppState } from '../types'
import { getBoundTextElement } from './textElement'
import { getGridPoint } from '../math'
import Scene from '../scene/Scene'
import { isArrowElement, isFrameLikeElement } from './typeChecks'

export const getDragOffsetXY = (
  selectedElements: NonDeletedExcalidrawElement[],
  x: number,
  y: number
): [number, number] => {
  const [x1, y1] = getCommonBounds(selectedElements)
  return [x - x1, y - y1]
}

export const dragNewElement = (
  draggingElement: NonDeletedExcalidrawElement,
  elementType: AppState['activeTool']['type'],
  originX: number,
  originY: number,
  x: number,
  y: number,
  width: number,
  height: number,
  shouldMaintainAspectRatio: boolean,
  shouldResizeFromCenter: boolean,
  /** whether to keep given aspect ratio when `isResizeWithSidesSameLength` is
      true */
  widthAspectRatio?: number | null,
  originOffset: {
    x: number
    y: number
  } | null = null
) => {
  if (shouldMaintainAspectRatio && draggingElement.type !== 'selection') {
    if (widthAspectRatio) {
      height = width / widthAspectRatio
    } else {
      // Depending on where the cursor is at (x, y) relative to where the starting point is
      // (originX, originY), we use ONLY width or height to control size increase.
      // This allows the cursor to always "stick" to one of the sides of the bounding box.
      if (Math.abs(y - originY) > Math.abs(x - originX)) {
        ;({ width, height } = getPerfectElementSize(elementType, height, x < originX ? -width : width))
      } else {
        ;({ width, height } = getPerfectElementSize(elementType, width, y < originY ? -height : height))
      }

      if (height < 0) {
        height = -height
      }
    }
  }

  let newX = x < originX ? originX - width : originX
  let newY = y < originY ? originY - height : originY

  if (shouldResizeFromCenter) {
    width += width
    height += height
    newX = originX - width / 2
    newY = originY - height / 2
  }

  if (width !== 0 && height !== 0) {
    mutateElement(draggingElement, {
      x: newX + (originOffset?.x ?? 0),
      y: newY + (originOffset?.y ?? 0),
      width,
      height
    })
  }
}
