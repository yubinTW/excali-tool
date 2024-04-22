import { ExcalidrawElement } from '../element/types'
import { AppState, BinaryFiles, UIAppState } from '../types'
import { MarkOptional } from '../utility-types'

export type ActionSource = 'ui' | 'keyboard' | 'contextMenu' | 'api' | 'commandPalette'

/** if false, the action should be prevented */
export type ActionResult =
  | {
      elements?: readonly ExcalidrawElement[] | null
      appState?: MarkOptional<AppState, 'offsetTop' | 'offsetLeft' | 'width' | 'height'> | null
      files?: BinaryFiles | null
      commitToHistory: boolean
      syncHistory?: boolean
      replaceFiles?: boolean
    }
  | false

type ActionFn = (
  elements: readonly ExcalidrawElement[],
  appState: Readonly<AppState>,
  formData: any,
  app: any // AppClassProperties,
) => ActionResult | Promise<ActionResult>

export type UpdaterFn = (res: ActionResult) => void
export type ActionFilterFn = (action: Action) => void

export type ActionName =
  | 'copy'
  | 'cut'
  | 'paste'
  | 'copyAsPng'
  | 'copyAsSvg'
  | 'copyText'
  | 'sendBackward'
  | 'bringForward'
  | 'sendToBack'
  | 'bringToFront'
  | 'copyStyles'
  | 'selectAll'
  | 'pasteStyles'
  | 'gridMode'
  | 'zenMode'
  | 'objectsSnapMode'
  | 'stats'
  | 'changeStrokeColor'
  | 'changeBackgroundColor'
  | 'changeFillStyle'
  | 'changeStrokeWidth'
  | 'changeStrokeShape'
  | 'changeSloppiness'
  | 'changeStrokeStyle'
  | 'changeArrowhead'
  | 'changeOpacity'
  | 'changeFontSize'
  | 'toggleCanvasMenu'
  | 'toggleEditMenu'
  | 'undo'
  | 'redo'
  | 'finalize'
  | 'changeProjectName'
  | 'changeExportBackground'
  | 'changeExportEmbedScene'
  | 'changeExportScale'
  | 'saveToActiveFile'
  | 'saveFileToDisk'
  | 'loadScene'
  | 'duplicateSelection'
  | 'deleteSelectedElements'
  | 'changeViewBackgroundColor'
  | 'clearCanvas'
  | 'zoomIn'
  | 'zoomOut'
  | 'resetZoom'
  | 'zoomToFit'
  | 'zoomToFitSelection'
  | 'zoomToFitSelectionInViewport'
  | 'changeFontFamily'
  | 'changeTextAlign'
  | 'changeVerticalAlign'
  | 'toggleFullScreen'
  | 'toggleShortcuts'
  | 'group'
  | 'ungroup'
  | 'goToCollaborator'
  | 'addToLibrary'
  | 'changeRoundness'
  | 'alignTop'
  | 'alignBottom'
  | 'alignLeft'
  | 'alignRight'
  | 'alignVerticallyCentered'
  | 'alignHorizontallyCentered'
  | 'distributeHorizontally'
  | 'distributeVertically'
  | 'flipHorizontal'
  | 'flipVertical'
  | 'viewMode'
  | 'exportWithDarkMode'
  | 'toggleTheme'
  | 'increaseFontSize'
  | 'decreaseFontSize'
  | 'unbindText'
  | 'hyperlink'
  | 'bindText'
  | 'unlockAllElements'
  | 'toggleElementLock'
  | 'toggleLinearEditor'
  | 'toggleEraserTool'
  | 'toggleHandTool'
  | 'selectAllElementsInFrame'
  | 'removeAllElementsFromFrame'
  | 'updateFrameRendering'
  | 'setFrameAsActiveTool'
  | 'setEmbeddableAsActiveTool'
  | 'createContainerFromText'
  | 'wrapTextInContainer'
  | 'commandPalette'

export type PanelComponentProps = {
  elements: readonly ExcalidrawElement[]
  appState: AppState
  updateData: <T = any>(formData?: T) => void
  appProps: any //ExcalidrawProps;
  data?: Record<string, any>
  app: any // AppClassProperties;
}

export interface Action {
  name: ActionName
  label:
    | string
    | ((
        elements: readonly ExcalidrawElement[],
        appState: Readonly<AppState>,
        app: any // AppClassProperties,
      ) => string)
  keywords?: string[]
  icon?:
    | any //React.ReactNode
    | ((appState: UIAppState, elements: readonly ExcalidrawElement[]) => any) // React.ReactNode;
  PanelComponent?: any // React.FC<PanelComponentProps>;
  perform: ActionFn
  keyPriority?: number
  keyTest?: (
    event: any, // React.KeyboardEvent | KeyboardEvent,
    appState: AppState,
    elements: readonly ExcalidrawElement[],
    app: any // AppClassProperties
  ) => boolean
  predicate?: (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    appProps: any, // ExcalidrawProps,
    app: any // AppClassProperties
  ) => boolean
  checked?: (appState: Readonly<AppState>) => boolean
  trackEvent:
    | false
    | {
        category: 'toolbar' | 'element' | 'canvas' | 'export' | 'history' | 'menu' | 'collab' | 'hyperlink'
        action?: string
        predicate?: (appState: Readonly<AppState>, elements: readonly ExcalidrawElement[], value: any) => boolean
      }
  /** if set to `true`, allow action to be performed in viewMode.
   *  Defaults to `false` */
  viewMode?: boolean
}
