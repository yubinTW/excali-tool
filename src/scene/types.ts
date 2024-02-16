import { ExcalidrawTextElement, NonDeletedElementsMap } from '../element/types'
import { Drawable } from '../externalLibrary/roughjs/core'
import { AppState, EmbedsValidationStatus } from '../types'
import { MakeBrand } from '../utility-types'

export type RenderableElementsMap = NonDeletedElementsMap & MakeBrand<'RenderableElementsMap'>

export type SVGRenderConfig = {
  offsetX: number
  offsetY: number
  isExporting: boolean
  exportWithDarkMode: boolean
  renderEmbeddables: boolean
  frameRendering: AppState['frameRendering']
  canvasBackgroundColor: AppState['viewBackgroundColor']
  embedsValidationStatus: EmbedsValidationStatus
}

export type InteractiveCanvasRenderConfig = {
  // collab-related state
  // ---------------------------------------------------------------------------
  remoteSelectedElementIds: { [elementId: string]: string[] }
  remotePointerViewportCoords: { [id: string]: { x: number; y: number } }
  remotePointerUserStates: { [id: string]: string }
  remotePointerUsernames: { [id: string]: string }
  remotePointerButton?: { [id: string]: string | undefined }
  selectionColor?: string
  // extra options passed to the renderer
  // ---------------------------------------------------------------------------
  renderScrollbars?: boolean
}

export type RenderInteractiveSceneCallback = {
  atLeastOneVisibleElement: boolean
  elementsMap: RenderableElementsMap
  scrollBars?: ScrollBars
}

export type SceneScroll = {
  scrollX: number
  scrollY: number
}

export interface Scene {
  elements: ExcalidrawTextElement[]
}

export type ExportType = 'png' | 'clipboard' | 'clipboard-svg' | 'backend' | 'svg'

export type ScrollBars = {
  horizontal: {
    x: number
    y: number
    width: number
    height: number
  } | null
  vertical: {
    x: number
    y: number
    width: number
    height: number
  } | null
}

export type ElementShape = Drawable | Drawable[] | null

export type ElementShapes = {
  rectangle: Drawable
  ellipse: Drawable
  diamond: Drawable
  iframe: Drawable
  embeddable: Drawable
  freedraw: Drawable | null
  arrow: Drawable[]
  line: Drawable[]
  text: null
  image: null
  frame: null
  magicframe: null
}
