import { getCommonBounds, getElementAbsoluteCoords, isTextElement } from './element'
import { mutateElement } from './element/mutateElement'
import { getBoundTextElement, getContainerElement } from './element/textElement'
import { isFrameLikeElement } from './element/typeChecks'
import {
  ElementsMap,
  ElementsMapOrArray,
  ExcalidrawElement,
  ExcalidrawFrameLikeElement,
  NonDeleted,
  NonDeletedExcalidrawElement
} from './element/types'
import { getElementsInGroup } from './groups'
import { isPointWithinBounds } from './math'
import Scene, { ExcalidrawElementsIncludingDeleted } from './scene/Scene'
import { StaticCanvasAppState } from './types'
import { ReadonlySetLike } from './utility-types'
import { arrayToMap } from './utils'

// --------------------------- Frame State ------------------------------------
export const bindElementsToFramesAfterDuplication = (
  nextElements: ExcalidrawElement[],
  oldElements: readonly ExcalidrawElement[],
  oldIdToDuplicatedId: Map<ExcalidrawElement['id'], ExcalidrawElement['id']>
) => {
  const nextElementMap = arrayToMap(nextElements) as Map<ExcalidrawElement['id'], ExcalidrawElement>

  for (const element of oldElements) {
    if (element.frameId) {
      // use its frameId to get the new frameId
      const nextElementId = oldIdToDuplicatedId.get(element.id)
      const nextFrameId = oldIdToDuplicatedId.get(element.frameId)
      if (nextElementId) {
        const nextElement = nextElementMap.get(nextElementId)
        if (nextElement) {
          mutateElement(
            nextElement,
            {
              frameId: nextFrameId ?? element.frameId
            },
            false
          )
        }
      }
    }
  }
}

export const elementsAreInFrameBounds = (elements: readonly ExcalidrawElement[], frame: ExcalidrawFrameLikeElement) => {
  const [frameX1, frameY1, frameX2, frameY2] = getElementAbsoluteCoords(frame)

  const [elementX1, elementY1, elementX2, elementY2] = getCommonBounds(elements)

  return frameX1 <= elementX1 && frameY1 <= elementY1 && frameX2 >= elementX2 && frameY2 >= elementY2
}

export const isCursorInFrame = (
  cursorCoords: {
    x: number
    y: number
  },
  frame: NonDeleted<ExcalidrawFrameLikeElement>
) => {
  const [fx1, fy1, fx2, fy2] = getElementAbsoluteCoords(frame)

  return isPointWithinBounds([fx1, fy1], [cursorCoords.x, cursorCoords.y], [fx2, fy2])
}

// --------------------------- Frame Utils ------------------------------------

/**
 * Returns a map of frameId to frame elements. Includes empty frames.
 */
export const groupByFrameLikes = (elements: readonly ExcalidrawElement[]) => {
  const frameElementsMap = new Map<ExcalidrawElement['id'], ExcalidrawElement[]>()

  for (const element of elements) {
    const frameId = isFrameLikeElement(element) ? element.id : element.frameId
    if (frameId && !frameElementsMap.has(frameId)) {
      frameElementsMap.set(frameId, getFrameChildren(elements, frameId))
    }
  }

  return frameElementsMap
}

export const getFrameChildren = (allElements: ElementsMapOrArray, frameId: string) => {
  const frameChildren: ExcalidrawElement[] = []
  for (const element of allElements.values()) {
    if (element.frameId === frameId) {
      frameChildren.push(element)
    }
  }
  return frameChildren
}

export const getFrameLikeElements = (allElements: ExcalidrawElementsIncludingDeleted): ExcalidrawFrameLikeElement[] => {
  return allElements.filter((element): element is ExcalidrawFrameLikeElement => isFrameLikeElement(element))
}

/**
 * Returns ExcalidrawFrameElements and non-frame-children elements.
 *
 * Considers children as root elements if they point to a frame parent
 * non-existing in the elements set.
 *
 * Considers non-frame bound elements (container or arrow labels) as root.
 */
export const getRootElements = (allElements: ExcalidrawElementsIncludingDeleted) => {
  const frameElements = arrayToMap(getFrameLikeElements(allElements))
  return allElements.filter(
    (element) => frameElements.has(element.id) || !element.frameId || !frameElements.has(element.frameId)
  )
}

export const getContainingFrame = (
  element: ExcalidrawElement,
  /**
   * Optionally an elements map, in case the elements aren't in the Scene yet.
   * Takes precedence over Scene elements, even if the element exists
   * in Scene elements and not the supplied elements map.
   */
  elementsMap?: Map<string, ExcalidrawElement>
) => {
  if (element.frameId) {
    if (elementsMap) {
      return (elementsMap.get(element.frameId) || null) as null | ExcalidrawFrameLikeElement
    }
    return (Scene.getScene(element)?.getElement(element.frameId) as ExcalidrawFrameLikeElement) || null
  }
  return null
}

// --------------------------- Frame Operations -------------------------------

/**
 * Retains (or repairs for target frame) the ordering invriant where children
 * elements come right before the parent frame:
 * [el, el, child, child, frame, el]
 *
 * @returns mutated allElements (same data structure)
 */
export const addElementsToFrame = <T extends ElementsMapOrArray>(
  allElements: T,
  elementsToAdd: NonDeletedExcalidrawElement[],
  frame: ExcalidrawFrameLikeElement
): T => {
  const elementsMap = arrayToMap(allElements)
  const currTargetFrameChildrenMap = new Map<ExcalidrawElement['id'], true>()
  for (const element of allElements.values()) {
    if (element.frameId === frame.id) {
      currTargetFrameChildrenMap.set(element.id, true)
    }
  }

  const suppliedElementsToAddSet = new Set(elementsToAdd.map((el) => el.id))

  const finalElementsToAdd: ExcalidrawElement[] = []

  const otherFrames = new Set<ExcalidrawFrameLikeElement['id']>()

  for (const element of elementsToAdd) {
    if (isFrameLikeElement(element) && element.id !== frame.id) {
      otherFrames.add(element.id)
    }
  }

  // - add bound text elements if not already in the array
  // - filter out elements that are already in the frame
  for (const element of omitGroupsContainingFrameLikes(allElements, elementsToAdd)) {
    // don't add frames or their children
    if (isFrameLikeElement(element) || (element.frameId && otherFrames.has(element.frameId))) {
      continue
    }

    if (!currTargetFrameChildrenMap.has(element.id)) {
      finalElementsToAdd.push(element)
    }

    const boundTextElement = getBoundTextElement(element, elementsMap)
    if (
      boundTextElement &&
      !suppliedElementsToAddSet.has(boundTextElement.id) &&
      !currTargetFrameChildrenMap.has(boundTextElement.id)
    ) {
      finalElementsToAdd.push(boundTextElement)
    }
  }

  for (const element of finalElementsToAdd) {
    mutateElement(
      element,
      {
        frameId: frame.id
      },
      false
    )
  }

  return allElements
}

export const removeElementsFromFrame = (
  elementsToRemove: ReadonlySetLike<NonDeletedExcalidrawElement>,
  elementsMap: ElementsMap
) => {
  const _elementsToRemove = new Map<ExcalidrawElement['id'], ExcalidrawElement>()

  const toRemoveElementsByFrame = new Map<ExcalidrawFrameLikeElement['id'], ExcalidrawElement[]>()

  for (const element of elementsToRemove) {
    if (element.frameId) {
      _elementsToRemove.set(element.id, element)

      const arr = toRemoveElementsByFrame.get(element.frameId) || []
      arr.push(element)

      const boundTextElement = getBoundTextElement(element, elementsMap)
      if (boundTextElement) {
        _elementsToRemove.set(boundTextElement.id, boundTextElement)
        arr.push(boundTextElement)
      }

      toRemoveElementsByFrame.set(element.frameId, arr)
    }
  }

  for (const [, element] of _elementsToRemove) {
    mutateElement(
      element,
      {
        frameId: null
      },
      false
    )
  }
}

export const removeAllElementsFromFrame = <T extends ExcalidrawElement>(
  allElements: readonly T[],
  frame: ExcalidrawFrameLikeElement
) => {
  const elementsInFrame = getFrameChildren(allElements, frame.id)
  removeElementsFromFrame(elementsInFrame, arrayToMap(allElements))
  return allElements
}

/**
 * filters out elements that are inside groups that contain a frame element
 * anywhere in the group tree
 */
export const omitGroupsContainingFrameLikes = (
  allElements: ElementsMapOrArray,
  /** subset of elements you want to filter. Optional perf optimization so we
   * don't have to filter all elements unnecessarily
   */
  selectedElements?: readonly ExcalidrawElement[]
) => {
  const uniqueGroupIds = new Set<string>()
  const elements = selectedElements || allElements

  for (const el of elements.values()) {
    const topMostGroupId = el.groupIds[el.groupIds.length - 1]
    if (topMostGroupId) {
      uniqueGroupIds.add(topMostGroupId)
    }
  }

  const rejectedGroupIds = new Set<string>()
  for (const groupId of uniqueGroupIds) {
    if (getElementsInGroup(allElements, groupId).some((el) => isFrameLikeElement(el))) {
      rejectedGroupIds.add(groupId)
    }
  }

  const ret: ExcalidrawElement[] = []

  for (const element of elements.values()) {
    if (!rejectedGroupIds.has(element.groupIds[element.groupIds.length - 1])) {
      ret.push(element)
    }
  }

  return ret
}

/**
 * depending on the appState, return target frame, which is the frame the given element
 * is going to be added to or remove from
 */
export const getTargetFrame = (
  element: ExcalidrawElement,
  elementsMap: ElementsMap,
  appState: StaticCanvasAppState
) => {
  const _element = isTextElement(element) ? getContainerElement(element, elementsMap) || element : element

  return appState.selectedElementIds[_element.id] && appState.selectedElementsAreBeingDragged
    ? appState.frameToHighlight
    : getContainingFrame(_element)
}
