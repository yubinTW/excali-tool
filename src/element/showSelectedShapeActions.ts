import { getSelectedElements } from '../scene'
import { UIAppState } from '../types'
import { NonDeletedExcalidrawElement } from './types'

export const showSelectedShapeActions = (appState: UIAppState, elements: readonly NonDeletedExcalidrawElement[]) =>
  Boolean(
    !appState.viewModeEnabled &&
      ((appState.activeTool.type !== 'custom' &&
        (appState.editingElement ||
          (appState.activeTool.type !== 'selection' &&
            appState.activeTool.type !== 'eraser' &&
            appState.activeTool.type !== 'hand' &&
            appState.activeTool.type !== 'laser'))) ||
        getSelectedElements(elements, appState).length)
  )
