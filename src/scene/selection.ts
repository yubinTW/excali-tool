import { isElementInViewport } from '../element/sizeHelpers'
import { isBoundToContainer, isFrameLikeElement } from '../element/typeChecks'
import { ElementsMapOrArray, ExcalidrawElement, NonDeletedExcalidrawElement } from '../element/types'
import { getFrameChildren } from '../frame'
import { AppState, InteractiveCanvasAppState } from '../types'
import { isShallowEqual } from '../utils'

/**
 * Frames and their containing elements are not to be selected at the same time.
 * Given an array of selected elements, if there are frames and their containing elements
 * we only keep the frames.
 * @param selectedElements
 */
export const excludeElementsInFramesFromSelection = <T extends ExcalidrawElement>(selectedElements: readonly T[]) => {
  const framesInSelection = new Set<T['id']>()

  selectedElements.forEach((element) => {
    if (isFrameLikeElement(element)) {
      framesInSelection.add(element.id)
    }
  })

  return selectedElements.filter((element) => {
    if (element.frameId && framesInSelection.has(element.frameId)) {
      return false
    }
    return true
  })
}

export const getVisibleAndNonSelectedElements = (
  elements: readonly NonDeletedExcalidrawElement[],
  selectedElements: readonly NonDeletedExcalidrawElement[],
  appState: AppState
) => {
  const selectedElementsSet = new Set(selectedElements.map((element) => element.id))
  return elements.filter((element) => {
    const isVisible = isElementInViewport(element, appState.width, appState.height, appState)

    return !selectedElementsSet.has(element.id) && isVisible
  })
}

// FIXME move this into the editor instance to keep utility methods stateless
export const isSomeElementSelected = (function () {
  let lastElements: readonly NonDeletedExcalidrawElement[] | null = null
  let lastSelectedElementIds: AppState['selectedElementIds'] | null = null
  let isSelected: boolean | null = null

  const ret = (
    elements: readonly NonDeletedExcalidrawElement[],
    appState: Pick<AppState, 'selectedElementIds'>
  ): boolean => {
    if (isSelected != null && elements === lastElements && appState.selectedElementIds === lastSelectedElementIds) {
      return isSelected
    }

    isSelected = elements.some((element) => appState.selectedElementIds[element.id])
    lastElements = elements
    lastSelectedElementIds = appState.selectedElementIds

    return isSelected
  }

  ret.clearCache = () => {
    lastElements = null
    lastSelectedElementIds = null
    isSelected = null
  }

  return ret
})()

/**
 * Returns common attribute (picked by `getAttribute` callback) of selected
 *  elements. If elements don't share the same value, returns `null`.
 */
export const getCommonAttributeOfSelectedElements = <T>(
  elements: readonly NonDeletedExcalidrawElement[],
  appState: Pick<AppState, 'selectedElementIds'>,
  getAttribute: (element: ExcalidrawElement) => T
): T | null => {
  const attributes = Array.from(
    new Set(getSelectedElements(elements, appState).map((element) => getAttribute(element)))
  )
  return attributes.length === 1 ? attributes[0] : null
}

export const getSelectedElements = (
  elements: ElementsMapOrArray,
  appState: Pick<InteractiveCanvasAppState, 'selectedElementIds'>,
  opts?: {
    includeBoundTextElement?: boolean
    includeElementsInFrames?: boolean
  }
) => {
  const selectedElements: ExcalidrawElement[] = []
  for (const element of elements.values()) {
    if (appState.selectedElementIds[element.id]) {
      selectedElements.push(element)
      continue
    }
    if (
      opts?.includeBoundTextElement &&
      isBoundToContainer(element) &&
      appState.selectedElementIds[element?.containerId]
    ) {
      selectedElements.push(element)
      continue
    }
  }

  if (opts?.includeElementsInFrames) {
    const elementsToInclude: ExcalidrawElement[] = []
    selectedElements.forEach((element) => {
      if (isFrameLikeElement(element)) {
        getFrameChildren(elements, element.id).forEach((e) => elementsToInclude.push(e))
      }
      elementsToInclude.push(element)
    })

    return elementsToInclude
  }

  return selectedElements
}

export const getTargetElements = (
  elements: ElementsMapOrArray,
  appState: Pick<AppState, 'selectedElementIds' | 'editingElement'>
) =>
  appState.editingElement
    ? [appState.editingElement]
    : getSelectedElements(elements, appState, {
        includeBoundTextElement: true
      })

/**
 * returns prevState's selectedElementids if no change from previous, so as to
 * retain reference identity for memoization
 */
export const makeNextSelectedElementIds = (
  nextSelectedElementIds: AppState['selectedElementIds'],
  prevState: Pick<AppState, 'selectedElementIds'>
) => {
  if (isShallowEqual(prevState.selectedElementIds, nextSelectedElementIds)) {
    return prevState.selectedElementIds
  }

  return nextSelectedElementIds
}
