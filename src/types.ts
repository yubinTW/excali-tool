import { Spreadsheet } from './charts'
import type { IMAGE_MIME_TYPES, MIME_TYPES } from './constants'
import { SuggestedBinding } from './element/binding'
import { LinearElementEditor } from './element/linearElementEditor'
import {
  Arrowhead,
  ChartType,
  ExcalidrawBindableElement,
  ExcalidrawElement,
  ExcalidrawElementType,
  ExcalidrawFrameLikeElement,
  ExcalidrawImageElement,
  ExcalidrawLinearElement,
  ExcalidrawMagicFrameElement,
  FileId,
  FontFamilyValues,
  GroupId,
  NonDeleted,
  NonDeletedExcalidrawElement,
  PointerType,
  StrokeRoundness,
  TextAlign,
  Theme
} from './element/types'
import { Point as RoughPoint } from './externalLibrary/roughjs/geometry'
import { SnapLine } from './snapping'
import { ValueOf } from './utility-types'

export type Point = Readonly<RoughPoint>

export type SocketId = string & { _brand: 'SocketId' }

export type Collaborator = Readonly<{
  pointer?: CollaboratorPointer
  button?: 'up' | 'down'
  selectedElementIds?: AppState['selectedElementIds']
  username?: string | null
  userState?: UserIdleState
  color?: {
    background: string
    stroke: string
  }
  // The url of the collaborator's avatar, defaults to username initials
  // if not present
  avatarUrl?: string
  // user id. If supplied, we'll filter out duplicates when rendering user avatars.
  id?: string
  socketId?: SocketId
  isCurrentUser?: boolean
}>

export type CollaboratorPointer = {
  x: number
  y: number
  tool: 'pointer' | 'laser'
}

export type DataURL = string & { _brand: 'DataURL' }

export type BinaryFileData = {
  mimeType:
    | ValueOf<typeof IMAGE_MIME_TYPES>
    // future user or unknown file type
    | typeof MIME_TYPES.binary
  id: FileId
  dataURL: DataURL
  /**
   * Epoch timestamp in milliseconds
   */
  created: number
  /**
   * Indicates when the file was last retrieved from storage to be loaded
   * onto the scene. We use this flag to determine whether to delete unused
   * files from storage.
   *
   * Epoch timestamp in milliseconds.
   */
  lastRetrieved?: number
}

export type BinaryFileMetadata = Omit<BinaryFileData, 'dataURL'>

export type BinaryFiles = Record<ExcalidrawElement['id'], BinaryFileData>

export type ToolType =
  | 'selection'
  | 'rectangle'
  | 'diamond'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'freedraw'
  | 'text'
  | 'image'
  | 'eraser'
  | 'hand'
  | 'frame'
  | 'magicframe'
  | 'embeddable'
  | 'laser'

export type ElementOrToolType = ExcalidrawElementType | ToolType | 'custom'

export type ActiveTool =
  | {
      type: ToolType
      customType: null
    }
  | {
      type: 'custom'
      customType: string
    }

export type SidebarName = string
export type SidebarTabName = string

export type UserToFollow = {
  socketId: SocketId
  username: string
}

type _CommonCanvasAppState = {
  zoom: AppState['zoom']
  scrollX: AppState['scrollX']
  scrollY: AppState['scrollY']
  width: AppState['width']
  height: AppState['height']
  viewModeEnabled: AppState['viewModeEnabled']
  editingGroupId: AppState['editingGroupId'] // TODO: move to interactive canvas if possible
  selectedElementIds: AppState['selectedElementIds'] // TODO: move to interactive canvas if possible
  frameToHighlight: AppState['frameToHighlight'] // TODO: move to interactive canvas if possible
  offsetLeft: AppState['offsetLeft']
  offsetTop: AppState['offsetTop']
  theme: AppState['theme']
  pendingImageElementId: AppState['pendingImageElementId']
}

export type StaticCanvasAppState = Readonly<
  _CommonCanvasAppState & {
    shouldCacheIgnoreZoom: AppState['shouldCacheIgnoreZoom']
    /** null indicates transparent bg */
    viewBackgroundColor: AppState['viewBackgroundColor'] | null
    exportScale: AppState['exportScale']
    selectedElementsAreBeingDragged: AppState['selectedElementsAreBeingDragged']
    gridSize: AppState['gridSize']
    frameRendering: AppState['frameRendering']
  }
>

export type InteractiveCanvasAppState = Readonly<
  _CommonCanvasAppState & {
    // renderInteractiveScene
    activeEmbeddable: AppState['activeEmbeddable']
    editingLinearElement: AppState['editingLinearElement']
    selectionElement: AppState['selectionElement']
    selectedGroupIds: AppState['selectedGroupIds']
    selectedLinearElement: AppState['selectedLinearElement']
    multiElement: AppState['multiElement']
    isBindingEnabled: AppState['isBindingEnabled']
    suggestedBindings: AppState['suggestedBindings']
    isRotating: AppState['isRotating']
    elementsToHighlight: AppState['elementsToHighlight']
    // Collaborators
    collaborators: AppState['collaborators']
    // SnapLines
    snapLines: AppState['snapLines']
    zenModeEnabled: AppState['zenModeEnabled']
  }
>

export interface AppState {
  contextMenu: {
    top: number
    left: number
  } | null
  showWelcomeScreen: boolean
  isLoading: boolean
  activeEmbeddable: {
    element: NonDeletedExcalidrawElement
    state: 'hover' | 'active'
  } | null
  draggingElement: NonDeletedExcalidrawElement | null
  resizingElement: NonDeletedExcalidrawElement | null
  multiElement: NonDeleted<ExcalidrawLinearElement> | null
  selectionElement: NonDeletedExcalidrawElement | null
  isBindingEnabled: boolean
  startBoundElement: NonDeleted<ExcalidrawBindableElement> | null
  suggestedBindings: SuggestedBinding[]
  frameToHighlight: NonDeleted<ExcalidrawFrameLikeElement> | null
  frameRendering: {
    enabled: boolean
    name: boolean
    outline: boolean
    clip: boolean
  }
  editingFrame: string | null
  elementsToHighlight: NonDeleted<ExcalidrawElement>[] | null
  // element being edited, but not necessarily added to elements array yet
  // (e.g. text element when typing into the input)
  editingElement: NonDeletedExcalidrawElement | null
  editingLinearElement: LinearElementEditor | null
  activeTool: {
    /**
     * indicates a previous tool we should revert back to if we deselect the
     * currently active tool. At the moment applies to `eraser` and `hand` tool.
     */
    lastActiveTool: ActiveTool | null
    locked: boolean
  } & ActiveTool
  penMode: boolean
  penDetected: boolean
  exportBackground: boolean
  exportEmbedScene: boolean
  exportWithDarkMode: boolean
  exportScale: number
  currentItemStrokeColor: string
  currentItemBackgroundColor: string
  currentItemFillStyle: ExcalidrawElement['fillStyle']
  currentItemStrokeWidth: number
  currentItemStrokeStyle: ExcalidrawElement['strokeStyle']
  currentItemRoughness: number
  currentItemOpacity: number
  currentItemFontFamily: FontFamilyValues
  currentItemFontSize: number
  currentItemTextAlign: TextAlign
  currentItemStartArrowhead: Arrowhead | null
  currentItemEndArrowhead: Arrowhead | null
  currentItemRoundness: StrokeRoundness
  viewBackgroundColor: string
  scrollX: number
  scrollY: number
  cursorButton: 'up' | 'down'
  scrolledOutside: boolean
  name: string
  isResizing: boolean
  isRotating: boolean
  zoom: Zoom
  openMenu: 'canvas' | 'shape' | null
  openPopup: 'canvasBackground' | 'elementBackground' | 'elementStroke' | null
  openSidebar: { name: SidebarName; tab?: SidebarTabName } | null
  openDialog:
    | null
    | { name: 'imageExport' | 'help' | 'jsonExport' }
    | {
        name: 'settings'
        source:
          | 'tool' // when magicframe tool is selected
          | 'generation' // when magicframe generate button is clicked
          | 'settings' // when AI settings dialog is explicitly invoked
        tab: 'text-to-diagram' | 'diagram-to-code'
      }
    | { name: 'ttd'; tab: 'text-to-diagram' | 'mermaid' }
  /**
   * Reflects user preference for whether the default sidebar should be docked.
   *
   * NOTE this is only a user preference and does not reflect the actual docked
   * state of the sidebar, because the host apps can override this through
   * a DefaultSidebar prop, which is not reflected back to the appState.
   */
  defaultSidebarDockedPreference: boolean

  lastPointerDownWith: PointerType
  selectedElementIds: Readonly<{ [id: string]: true }>
  previousSelectedElementIds: { [id: string]: true }
  selectedElementsAreBeingDragged: boolean
  shouldCacheIgnoreZoom: boolean
  toast: { message: string; closable?: boolean; duration?: number } | null
  zenModeEnabled: boolean
  theme: Theme
  gridSize: number | null
  viewModeEnabled: boolean

  /** top-most selected groups (i.e. does not include nested groups) */
  selectedGroupIds: { [groupId: string]: boolean }
  /** group being edited when you drill down to its constituent element
    (e.g. when you double-click on a group's element) */
  editingGroupId: GroupId | null
  width: number
  height: number
  offsetTop: number
  offsetLeft: number

  fileHandle: FileSystemHandle | null
  collaborators: Map<SocketId, Collaborator>
  showStats: boolean
  currentChartType: ChartType
  pasteDialog:
    | {
        shown: false
        data: null
      }
    | {
        shown: true
        data: Spreadsheet
      }
  /** imageElement waiting to be placed on canvas */
  pendingImageElementId: ExcalidrawImageElement['id'] | null
  showHyperlinkPopup: false | 'info' | 'editor'
  selectedLinearElement: LinearElementEditor | null
  snapLines: readonly SnapLine[]
  originSnapOffset: {
    x: number
    y: number
  } | null
  objectsSnapModeEnabled: boolean
  /** the user's clientId & username who is being followed on the canvas */
  userToFollow: UserToFollow | null
  /** the clientIds of the users following the current user */
  followedBy: Set<SocketId>
}

export type UIAppState = Omit<
  AppState,
  'suggestedBindings' | 'startBoundElement' | 'cursorButton' | 'scrollX' | 'scrollY'
>

export type NormalizedZoomValue = number & { _brand: 'normalizedZoom' }

export type Zoom = Readonly<{
  value: NormalizedZoomValue
}>

export type PointerCoords = Readonly<{
  x: number
  y: number
}>

export type Gesture = {
  pointers: Map<number, PointerCoords>
  lastCenter: { x: number; y: number } | null
  initialDistance: number | null
  initialScale: number | null
}

export declare class GestureEvent extends UIEvent {
  readonly rotation: number
  readonly scale: number
}

// libraries
// -----------------------------------------------------------------------------
/** @deprecated legacy: do not use outside of migration paths */
export type LibraryItem_v1 = readonly NonDeleted<ExcalidrawElement>[]
/** @deprecated legacy: do not use outside of migration paths */
type LibraryItems_v1 = readonly LibraryItem_v1[]

/** v2 library item */
export type LibraryItem = {
  id: string
  status: 'published' | 'unpublished'
  elements: readonly NonDeleted<ExcalidrawElement>[]
  /** timestamp in epoch (ms) */
  created: number
  name?: string
  error?: string
}
export type LibraryItems = readonly LibraryItem[]
export type LibraryItems_anyVersion = LibraryItems | LibraryItems_v1

export type LibraryItemsSource =
  | ((currentLibraryItems: LibraryItems) => Blob | LibraryItems_anyVersion | Promise<LibraryItems_anyVersion | Blob>)
  | Blob
  | LibraryItems_anyVersion
  | Promise<LibraryItems_anyVersion | Blob>
// -----------------------------------------------------------------------------

export type OnUserFollowedPayload = {
  userToFollow: UserToFollow
  action: 'FOLLOW' | 'UNFOLLOW'
}

export enum UserIdleState {
  ACTIVE = 'active',
  AWAY = 'away',
  IDLE = 'idle'
}

export type Device = Readonly<{
  viewport: {
    isMobile: boolean
    isLandscape: boolean
  }
  editor: {
    isMobile: boolean
    canFitSidebar: boolean
  }
  isTouchScreen: boolean
}>

type FrameNameBounds = {
  x: number
  y: number
  width: number
  height: number
  angle: number
}

export type FrameNameBoundsCache = {
  get: (frameElement: ExcalidrawFrameLikeElement | ExcalidrawMagicFrameElement) => FrameNameBounds | null
  _cache: Map<
    string,
    FrameNameBounds & {
      zoom: AppState['zoom']['value']
      versionNonce: ExcalidrawFrameLikeElement['versionNonce']
    }
  >
}

export type KeyboardModifiersObject = {
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  metaKey: boolean
}

export type Primitive = number | string | boolean | bigint | symbol | null | undefined

export type JSONValue = string | number | boolean | null | object

export type EmbedsValidationStatus = Map<string, boolean>

export type ElementsPendingErasure = Set<ExcalidrawElement['id']>
