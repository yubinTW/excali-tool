import { getBoundTextElement } from './element/textElement'
import { ElementsMap, ElementsMapOrArray, ExcalidrawElement, GroupId, NonDeleted } from './element/types'
import { AppState, InteractiveCanvasAppState } from './types'

export const selectGroup = (
  groupId: GroupId,
  appState: InteractiveCanvasAppState,
  elements: readonly NonDeleted<ExcalidrawElement>[]
): Pick<InteractiveCanvasAppState, 'selectedGroupIds' | 'selectedElementIds' | 'editingGroupId'> => {
  const elementsInGroup = elements.reduce((acc: Record<string, true>, element) => {
    if (element.groupIds.includes(groupId)) {
      acc[element.id] = true
    }
    return acc
  }, {})

  if (Object.keys(elementsInGroup).length < 2) {
    if (appState.selectedGroupIds[groupId] || appState.editingGroupId === groupId) {
      return {
        selectedElementIds: appState.selectedElementIds,
        selectedGroupIds: { ...appState.selectedGroupIds, [groupId]: false },
        editingGroupId: null
      }
    }
    return appState
  }

  return {
    editingGroupId: appState.editingGroupId,
    selectedGroupIds: { ...appState.selectedGroupIds, [groupId]: true },
    selectedElementIds: {
      ...appState.selectedElementIds,
      ...elementsInGroup
    }
  }
}

/**
 * If the element's group is selected, don't render an individual
 * selection border around it.
 */
export const isSelectedViaGroup = (appState: InteractiveCanvasAppState, element: ExcalidrawElement) =>
  getSelectedGroupForElement(appState, element) != null

export const getSelectedGroupForElement = (appState: InteractiveCanvasAppState, element: ExcalidrawElement) =>
  element.groupIds
    .filter((groupId) => groupId !== appState.editingGroupId)
    .find((groupId) => appState.selectedGroupIds[groupId])

export const getSelectedGroupIds = (appState: InteractiveCanvasAppState): GroupId[] =>
  Object.entries(appState.selectedGroupIds)
    .filter(([groupId, isSelected]) => isSelected)
    .map(([groupId, isSelected]) => groupId)

// given a list of elements, return the the actual group ids that should be selected
// or used to update the elements
export const selectGroupsFromGivenElements = (
  elements: readonly NonDeleted<ExcalidrawElement>[],
  appState: InteractiveCanvasAppState
) => {
  let nextAppState: InteractiveCanvasAppState = {
    ...appState,
    selectedGroupIds: {}
  }

  for (const element of elements) {
    let groupIds = element.groupIds
    if (appState.editingGroupId) {
      const indexOfEditingGroup = groupIds.indexOf(appState.editingGroupId)
      if (indexOfEditingGroup > -1) {
        groupIds = groupIds.slice(0, indexOfEditingGroup)
      }
    }
    if (groupIds.length > 0) {
      const groupId = groupIds[groupIds.length - 1]
      nextAppState = {
        ...nextAppState,
        ...selectGroup(groupId, nextAppState, elements)
      }
    }
  }

  return nextAppState.selectedGroupIds
}

export const editGroupForSelectedElement = (appState: AppState, element: NonDeleted<ExcalidrawElement>): AppState => {
  return {
    ...appState,
    editingGroupId: element.groupIds.length ? element.groupIds[0] : null,
    selectedGroupIds: {},
    selectedElementIds: {
      [element.id]: true
    }
  }
}

export const isElementInGroup = (element: ExcalidrawElement, groupId: string) => element.groupIds.includes(groupId)

export const getElementsInGroup = (elements: ElementsMapOrArray, groupId: string) => {
  const elementsInGroup: ExcalidrawElement[] = []
  for (const element of elements.values()) {
    if (isElementInGroup(element, groupId)) {
      elementsInGroup.push(element)
    }
  }
  return elementsInGroup
}

export const getSelectedGroupIdForElement = (
  element: ExcalidrawElement,
  selectedGroupIds: { [groupId: string]: boolean }
) => element.groupIds.find((groupId) => selectedGroupIds[groupId])

export const getNewGroupIdsForDuplication = (
  groupIds: ExcalidrawElement['groupIds'],
  editingGroupId: AppState['editingGroupId'],
  mapper: (groupId: GroupId) => GroupId
) => {
  const copy = [...groupIds]
  const positionOfEditingGroupId = editingGroupId ? groupIds.indexOf(editingGroupId) : -1
  const endIndex = positionOfEditingGroupId > -1 ? positionOfEditingGroupId : groupIds.length
  for (let index = 0; index < endIndex; index++) {
    copy[index] = mapper(copy[index])
  }

  return copy
}

export const addToGroup = (
  prevGroupIds: ExcalidrawElement['groupIds'],
  newGroupId: GroupId,
  editingGroupId: AppState['editingGroupId']
) => {
  // insert before the editingGroupId, or push to the end.
  const groupIds = [...prevGroupIds]
  const positionOfEditingGroupId = editingGroupId ? groupIds.indexOf(editingGroupId) : -1
  const positionToInsert = positionOfEditingGroupId > -1 ? positionOfEditingGroupId : groupIds.length
  groupIds.splice(positionToInsert, 0, newGroupId)
  return groupIds
}

export const removeFromSelectedGroups = (
  groupIds: ExcalidrawElement['groupIds'],
  selectedGroupIds: { [groupId: string]: boolean }
) => groupIds.filter((groupId) => !selectedGroupIds[groupId])

export const getMaximumGroups = (elements: ExcalidrawElement[], elementsMap: ElementsMap): ExcalidrawElement[][] => {
  const groups: Map<string, ExcalidrawElement[]> = new Map<string, ExcalidrawElement[]>()
  elements.forEach((element: ExcalidrawElement) => {
    const groupId = element.groupIds.length === 0 ? element.id : element.groupIds[element.groupIds.length - 1]

    const currentGroupMembers = groups.get(groupId) || []

    // Include bound text if present when grouping
    const boundTextElement = getBoundTextElement(element, elementsMap)
    if (boundTextElement) {
      currentGroupMembers.push(boundTextElement)
    }
    groups.set(groupId, [...currentGroupMembers, element])
  })

  return Array.from(groups.values())
}

export const elementsAreInSameGroup = (elements: ExcalidrawElement[]) => {
  const allGroups = elements.flatMap((element) => element.groupIds)
  const groupCount = new Map<string, number>()
  let maxGroup = 0

  for (const group of allGroups) {
    groupCount.set(group, (groupCount.get(group) ?? 0) + 1)
    if (groupCount.get(group)! > maxGroup) {
      maxGroup = groupCount.get(group)!
    }
  }

  return maxGroup === elements.length
}
