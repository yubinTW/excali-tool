import { isInvisiblySmallElement } from './sizeHelpers'
import { isLinearElementType } from './typeChecks'
import { ExcalidrawElement, NonDeleted, NonDeletedExcalidrawElement } from './types'

export {
  getArrowheadPoints,
  getClosestElementBounds,
  getCommonBounds,
  getDiamondPoints,
  getElementAbsoluteCoords,
  getElementBounds
} from './bounds'
export { hitTest, isHittingElementBoundingBoxWithoutHittingElement } from './collision'
export { dragNewElement, getDragOffsetXY } from './dragElements'
export {
  duplicateElement,
  newElement,
  newImageElement,
  newLinearElement,
  newTextElement,
  refreshTextDimensions,
  updateTextElement
} from './newElement'
export {
  getCursorForResizingElement,
  getElementWithTransformHandleType,
  getTransformHandleTypeFromCoords,
  resizeTest
} from './resizeTest'
export { showSelectedShapeActions } from './showSelectedShapeActions'
export {
  getLockedLinearCursorAlignSize,
  getNormalizedDimensions,
  getPerfectElementSize,
  isInvisiblySmallElement,
  resizePerfectLineForNWHandler
} from './sizeHelpers'
export { redrawTextBoundingBox } from './textElement'
export {
  getTransformHandles,
  getTransformHandlesFromCoords,
  OMIT_SIDES_FOR_MULTIPLE_ELEMENTS
} from './transformHandles'
export { isExcalidrawElement, isTextElement } from './typeChecks'

export const getSceneVersion = (elements: readonly ExcalidrawElement[]) =>
  elements.reduce((acc, el) => acc + el.version, 0)

export const getVisibleElements = (elements: readonly ExcalidrawElement[]) =>
  elements.filter((el) => !el.isDeleted && !isInvisiblySmallElement(el)) as readonly NonDeletedExcalidrawElement[]

export const getNonDeletedElements = <T extends ExcalidrawElement>(elements: readonly T[]) =>
  elements.filter((element) => !element.isDeleted) as readonly NonDeleted<T>[]

export const isNonDeletedElement = <T extends ExcalidrawElement>(element: T): element is NonDeleted<T> =>
  !element.isDeleted

const _clearElements = (elements: readonly ExcalidrawElement[]): ExcalidrawElement[] =>
  getNonDeletedElements(elements).map((element) =>
    isLinearElementType(element.type) ? { ...element, lastCommittedPoint: null } : element
  )

export const clearElementsForDatabase = (elements: readonly ExcalidrawElement[]) => _clearElements(elements)

export const clearElementsForExport = (elements: readonly ExcalidrawElement[]) => _clearElements(elements)

export const clearElementsForLocalStorage = (elements: readonly ExcalidrawElement[]) => _clearElements(elements)
