import { DRAGGING_THRESHOLD } from '../constants'
import {
  arePointsEqual,
  centerPoint,
  distance2d,
  getBezierCurveLength,
  getBezierXY,
  getControlPointsForBezierCurve,
  getGridPoint,
  isPathALoop,
  mapIntervalToBezierT,
  rotate,
  rotatePoint
} from '../math'
import Scene from '../scene/Scene'
import { ShapeCache } from '../scene/ShapeCache'
import { AppState, InteractiveCanvasAppState, Point, PointerCoords } from '../types'
import { Mutable } from '../utility-types'
import { tupleToCoors } from '../utils'
import { getElementAbsoluteCoords, getLockedLinearCursorAlignSize } from '.'
import { getHoveredElementForBinding, isBindingEnabled } from './binding'
import { Bounds, getCurvePathOps, getElementPointsCoords, getMinMaxXYFromCurvePathOps } from './bounds'
import { mutateElement } from './mutateElement'
import { getBoundTextElement } from './textElement'
import {
  ElementsMap,
  ExcalidrawBindableElement,
  ExcalidrawElement,
  ExcalidrawLinearElement,
  ExcalidrawTextElementWithContainer,
  NonDeleted,
  PointBinding
} from './types'

const editorMidPointsCache: {
  version: number | null
  points: (Point | null)[]
  zoom: number | null
} = { version: null, points: [], zoom: null }
export class LinearElementEditor {
  public readonly elementId: ExcalidrawElement['id'] & {
    _brand: 'excalidrawLinearElementId'
  }
  /** indices */
  public readonly selectedPointsIndices: readonly number[] | null

  public readonly pointerDownState: Readonly<{
    prevSelectedPointsIndices: readonly number[] | null
    /** index */
    lastClickedPoint: number
    origin: Readonly<{ x: number; y: number }> | null
    segmentMidpoint: {
      value: Point | null
      index: number | null
      added: boolean
    }
  }>

  /** whether you're dragging a point */
  public readonly isDragging: boolean
  public readonly lastUncommittedPoint: Point | null
  public readonly pointerOffset: Readonly<{ x: number; y: number }>
  public readonly startBindingElement: ExcalidrawBindableElement | null | 'keep'
  public readonly endBindingElement: ExcalidrawBindableElement | null | 'keep'
  public readonly hoverPointIndex: number
  public readonly segmentMidPointHoveredCoords: Point | null

  constructor(element: NonDeleted<ExcalidrawLinearElement>, scene: Scene) {
    this.elementId = element.id as string & {
      _brand: 'excalidrawLinearElementId'
    }
    Scene.mapElementToScene(this.elementId, scene)
    LinearElementEditor.normalizePoints(element)

    this.selectedPointsIndices = null
    this.lastUncommittedPoint = null
    this.isDragging = false
    this.pointerOffset = { x: 0, y: 0 }
    this.startBindingElement = 'keep'
    this.endBindingElement = 'keep'
    this.pointerDownState = {
      prevSelectedPointsIndices: null,
      lastClickedPoint: -1,
      origin: null,

      segmentMidpoint: {
        value: null,
        index: null,
        added: false
      }
    }
    this.hoverPointIndex = -1
    this.segmentMidPointHoveredCoords = null
  }

  // ---------------------------------------------------------------------------
  // static methods
  // ---------------------------------------------------------------------------

  static POINT_HANDLE_SIZE = 10
  /**
   * @param id the `elementId` from the instance of this class (so that we can
   *  statically guarantee this method returns an ExcalidrawLinearElement)
   */
  static getElement(id: InstanceType<typeof LinearElementEditor>['elementId']) {
    const element = Scene.getScene(id)?.getNonDeletedElement(id)
    if (element) {
      return element as NonDeleted<ExcalidrawLinearElement>
    }
    return null
  }

  static handlePointerUp(
    event: PointerEvent,
    editingLinearElement: LinearElementEditor,
    appState: AppState
  ): LinearElementEditor {
    const { elementId, selectedPointsIndices, isDragging, pointerDownState } = editingLinearElement
    const element = LinearElementEditor.getElement(elementId)
    if (!element) {
      return editingLinearElement
    }

    const bindings: Mutable<
      Partial<Pick<InstanceType<typeof LinearElementEditor>, 'startBindingElement' | 'endBindingElement'>>
    > = {}

    if (isDragging && selectedPointsIndices) {
      for (const selectedPoint of selectedPointsIndices) {
        if (selectedPoint === 0 || selectedPoint === element.points.length - 1) {
          if (isPathALoop(element.points, appState.zoom.value)) {
            LinearElementEditor.movePoints(element, [
              {
                index: selectedPoint,
                point: selectedPoint === 0 ? element.points[element.points.length - 1] : element.points[0]
              }
            ])
          }

          const bindingElement = isBindingEnabled(appState)
            ? getHoveredElementForBinding(
                tupleToCoors(LinearElementEditor.getPointAtIndexGlobalCoordinates(element, selectedPoint!)),
                Scene.getScene(element)!
              )
            : null

          bindings[selectedPoint === 0 ? 'startBindingElement' : 'endBindingElement'] = bindingElement
        }
      }
    }

    return {
      ...editingLinearElement,
      ...bindings,
      // if clicking without previously dragging a point(s), and not holding
      // shift, deselect all points except the one clicked. If holding shift,
      // toggle the point.
      selectedPointsIndices:
        isDragging || event.shiftKey
          ? !isDragging &&
            event.shiftKey &&
            pointerDownState.prevSelectedPointsIndices?.includes(pointerDownState.lastClickedPoint)
            ? selectedPointsIndices &&
              selectedPointsIndices.filter((pointIndex) => pointIndex !== pointerDownState.lastClickedPoint)
            : selectedPointsIndices
          : selectedPointsIndices?.includes(pointerDownState.lastClickedPoint)
            ? [pointerDownState.lastClickedPoint]
            : selectedPointsIndices,
      isDragging: false,
      pointerOffset: { x: 0, y: 0 }
    }
  }

  static getEditorMidPoints = (
    element: NonDeleted<ExcalidrawLinearElement>,
    elementsMap: ElementsMap,
    appState: InteractiveCanvasAppState
  ): (typeof editorMidPointsCache)['points'] => {
    const boundText = getBoundTextElement(element, elementsMap)

    // Since its not needed outside editor unless 2 pointer lines or bound text
    if (!appState.editingLinearElement && element.points.length > 2 && !boundText) {
      return []
    }
    if (editorMidPointsCache.version === element.version && editorMidPointsCache.zoom === appState.zoom.value) {
      return editorMidPointsCache.points
    }
    LinearElementEditor.updateEditorMidPointsCache(element, appState)
    return editorMidPointsCache.points!
  }

  static updateEditorMidPointsCache = (
    element: NonDeleted<ExcalidrawLinearElement>,
    appState: InteractiveCanvasAppState
  ) => {
    const points = LinearElementEditor.getPointsGlobalCoordinates(element)

    let index = 0
    const midpoints: (Point | null)[] = []
    while (index < points.length - 1) {
      if (
        LinearElementEditor.isSegmentTooShort(element, element.points[index], element.points[index + 1], appState.zoom)
      ) {
        midpoints.push(null)
        index++
        continue
      }
      const segmentMidPoint = LinearElementEditor.getSegmentMidPoint(
        element,
        points[index],
        points[index + 1],
        index + 1
      )
      midpoints.push(segmentMidPoint)
      index++
    }
    editorMidPointsCache.points = midpoints
    editorMidPointsCache.version = element.version
    editorMidPointsCache.zoom = appState.zoom.value
  }

  static getSegmentMidpointHitCoords = (
    linearElementEditor: LinearElementEditor,
    scenePointer: { x: number; y: number },
    appState: AppState,
    elementsMap: ElementsMap
  ) => {
    const { elementId } = linearElementEditor
    const element = LinearElementEditor.getElement(elementId)
    if (!element) {
      return null
    }
    const clickedPointIndex = LinearElementEditor.getPointIndexUnderCursor(
      element,
      appState.zoom,
      scenePointer.x,
      scenePointer.y
    )
    if (clickedPointIndex >= 0) {
      return null
    }
    const points = LinearElementEditor.getPointsGlobalCoordinates(element)
    if (points.length >= 3 && !appState.editingLinearElement) {
      return null
    }

    const threshold = LinearElementEditor.POINT_HANDLE_SIZE / appState.zoom.value

    const existingSegmentMidpointHitCoords = linearElementEditor.segmentMidPointHoveredCoords
    if (existingSegmentMidpointHitCoords) {
      const distance = distance2d(
        existingSegmentMidpointHitCoords[0],
        existingSegmentMidpointHitCoords[1],
        scenePointer.x,
        scenePointer.y
      )
      if (distance <= threshold) {
        return existingSegmentMidpointHitCoords
      }
    }
    let index = 0
    const midPoints: (typeof editorMidPointsCache)['points'] = LinearElementEditor.getEditorMidPoints(
      element,
      elementsMap,
      appState
    )
    while (index < midPoints.length) {
      if (midPoints[index] !== null) {
        const distance = distance2d(midPoints[index]![0], midPoints[index]![1], scenePointer.x, scenePointer.y)
        if (distance <= threshold) {
          return midPoints[index]
        }
      }

      index++
    }
    return null
  }

  static isSegmentTooShort(
    element: NonDeleted<ExcalidrawLinearElement>,
    startPoint: Point,
    endPoint: Point,
    zoom: AppState['zoom']
  ) {
    let distance = distance2d(startPoint[0], startPoint[1], endPoint[0], endPoint[1])
    if (element.points.length > 2 && element.roundness) {
      distance = getBezierCurveLength(element, endPoint)
    }

    return distance * zoom.value < LinearElementEditor.POINT_HANDLE_SIZE * 4
  }

  static getSegmentMidPoint(
    element: NonDeleted<ExcalidrawLinearElement>,
    startPoint: Point,
    endPoint: Point,
    endPointIndex: number
  ) {
    let segmentMidPoint = centerPoint(startPoint, endPoint)
    if (element.points.length > 2 && element.roundness) {
      const controlPoints = getControlPointsForBezierCurve(element, element.points[endPointIndex])
      if (controlPoints) {
        const t = mapIntervalToBezierT(element, element.points[endPointIndex], 0.5)

        const [tx, ty] = getBezierXY(controlPoints[0], controlPoints[1], controlPoints[2], controlPoints[3], t)
        segmentMidPoint = LinearElementEditor.getPointGlobalCoordinates(element, [tx, ty])
      }
    }

    return segmentMidPoint
  }

  static getSegmentMidPointIndex(
    linearElementEditor: LinearElementEditor,
    appState: AppState,
    midPoint: Point,
    elementsMap: ElementsMap
  ) {
    const element = LinearElementEditor.getElement(linearElementEditor.elementId)
    if (!element) {
      return -1
    }
    const midPoints = LinearElementEditor.getEditorMidPoints(element, elementsMap, appState)
    let index = 0
    while (index < midPoints.length) {
      if (LinearElementEditor.arePointsEqual(midPoint, midPoints[index])) {
        return index + 1
      }
      index++
    }
    return -1
  }

  static arePointsEqual(point1: Point | null, point2: Point | null) {
    if (!point1 && !point2) {
      return true
    }
    if (!point1 || !point2) {
      return false
    }
    return arePointsEqual(point1, point2)
  }

  /** scene coords */
  static getPointGlobalCoordinates(element: NonDeleted<ExcalidrawLinearElement>, point: Point) {
    const [x1, y1, x2, y2] = getElementAbsoluteCoords(element)
    const cx = (x1 + x2) / 2
    const cy = (y1 + y2) / 2

    let { x, y } = element
    ;[x, y] = rotate(x + point[0], y + point[1], cx, cy, element.angle)
    return [x, y] as const
  }

  /** scene coords */
  static getPointsGlobalCoordinates(element: NonDeleted<ExcalidrawLinearElement>): Point[] {
    const [x1, y1, x2, y2] = getElementAbsoluteCoords(element)
    const cx = (x1 + x2) / 2
    const cy = (y1 + y2) / 2
    return element.points.map((point) => {
      let { x, y } = element
      ;[x, y] = rotate(x + point[0], y + point[1], cx, cy, element.angle)
      return [x, y] as const
    })
  }

  static getPointAtIndexGlobalCoordinates(
    element: NonDeleted<ExcalidrawLinearElement>,
    indexMaybeFromEnd: number // -1 for last element
  ): Point {
    const index = indexMaybeFromEnd < 0 ? element.points.length + indexMaybeFromEnd : indexMaybeFromEnd
    const [x1, y1, x2, y2] = getElementAbsoluteCoords(element)
    const cx = (x1 + x2) / 2
    const cy = (y1 + y2) / 2

    const point = element.points[index]
    const { x, y } = element
    return point ? rotate(x + point[0], y + point[1], cx, cy, element.angle) : rotate(x, y, cx, cy, element.angle)
  }

  static pointFromAbsoluteCoords(element: NonDeleted<ExcalidrawLinearElement>, absoluteCoords: Point): Point {
    const [x1, y1, x2, y2] = getElementAbsoluteCoords(element)
    const cx = (x1 + x2) / 2
    const cy = (y1 + y2) / 2
    const [x, y] = rotate(absoluteCoords[0], absoluteCoords[1], cx, cy, -element.angle)
    return [x - element.x, y - element.y]
  }

  static getPointIndexUnderCursor(
    element: NonDeleted<ExcalidrawLinearElement>,
    zoom: AppState['zoom'],
    x: number,
    y: number
  ) {
    const pointHandles = LinearElementEditor.getPointsGlobalCoordinates(element)
    let idx = pointHandles.length
    // loop from right to left because points on the right are rendered over
    // points on the left, thus should take precedence when clicking, if they
    // overlap
    while (--idx > -1) {
      const point = pointHandles[idx]
      if (
        distance2d(x, y, point[0], point[1]) * zoom.value <
        // +1px to account for outline stroke
        LinearElementEditor.POINT_HANDLE_SIZE + 1
      ) {
        return idx
      }
    }
    return -1
  }

  static createPointAt(
    element: NonDeleted<ExcalidrawLinearElement>,
    scenePointerX: number,
    scenePointerY: number,
    gridSize: number | null
  ): Point {
    const pointerOnGrid = getGridPoint(scenePointerX, scenePointerY, gridSize)
    const [x1, y1, x2, y2] = getElementAbsoluteCoords(element)
    const cx = (x1 + x2) / 2
    const cy = (y1 + y2) / 2
    const [rotatedX, rotatedY] = rotate(pointerOnGrid[0], pointerOnGrid[1], cx, cy, -element.angle)

    return [rotatedX - element.x, rotatedY - element.y]
  }

  /**
   * Normalizes line points so that the start point is at [0,0]. This is
   * expected in various parts of the codebase. Also returns new x/y to account
   * for the potential normalization.
   */
  static getNormalizedPoints(element: ExcalidrawLinearElement) {
    const { points } = element

    const offsetX = points[0][0]
    const offsetY = points[0][1]

    return {
      points: points.map((point) => {
        return [point[0] - offsetX, point[1] - offsetY] as const
      }),
      x: element.x + offsetX,
      y: element.y + offsetY
    }
  }

  // element-mutating methods
  // ---------------------------------------------------------------------------

  static normalizePoints(element: NonDeleted<ExcalidrawLinearElement>) {
    mutateElement(element, LinearElementEditor.getNormalizedPoints(element))
  }

  static duplicateSelectedPoints(appState: AppState) {
    if (!appState.editingLinearElement) {
      return false
    }

    const { selectedPointsIndices, elementId } = appState.editingLinearElement

    const element = LinearElementEditor.getElement(elementId)

    if (!element || selectedPointsIndices === null) {
      return false
    }

    const { points } = element

    const nextSelectedIndices: number[] = []

    let pointAddedToEnd = false
    let indexCursor = -1
    const nextPoints = points.reduce((acc: Point[], point, index) => {
      ++indexCursor
      acc.push(point)

      const isSelected = selectedPointsIndices.includes(index)
      if (isSelected) {
        const nextPoint = points[index + 1]

        if (!nextPoint) {
          pointAddedToEnd = true
        }
        acc.push(nextPoint ? [(point[0] + nextPoint[0]) / 2, (point[1] + nextPoint[1]) / 2] : [point[0], point[1]])

        nextSelectedIndices.push(indexCursor + 1)
        ++indexCursor
      }

      return acc
    }, [])

    mutateElement(element, { points: nextPoints })

    // temp hack to ensure the line doesn't move when adding point to the end,
    // potentially expanding the bounding box
    if (pointAddedToEnd) {
      const lastPoint = element.points[element.points.length - 1]
      LinearElementEditor.movePoints(element, [
        {
          index: element.points.length - 1,
          point: [lastPoint[0] + 30, lastPoint[1] + 30]
        }
      ])
    }

    return {
      appState: {
        ...appState,
        editingLinearElement: {
          ...appState.editingLinearElement,
          selectedPointsIndices: nextSelectedIndices
        }
      }
    }
  }

  static deletePoints(element: NonDeleted<ExcalidrawLinearElement>, pointIndices: readonly number[]) {
    let offsetX = 0
    let offsetY = 0

    const isDeletingOriginPoint = pointIndices.includes(0)

    // if deleting first point, make the next to be [0,0] and recalculate
    // positions of the rest with respect to it
    if (isDeletingOriginPoint) {
      const firstNonDeletedPoint = element.points.find((point, idx) => {
        return !pointIndices.includes(idx)
      })
      if (firstNonDeletedPoint) {
        offsetX = firstNonDeletedPoint[0]
        offsetY = firstNonDeletedPoint[1]
      }
    }

    const nextPoints = element.points.reduce((acc: Point[], point, idx) => {
      if (!pointIndices.includes(idx)) {
        acc.push(!acc.length ? [0, 0] : [point[0] - offsetX, point[1] - offsetY])
      }
      return acc
    }, [])

    LinearElementEditor._updatePoints(element, nextPoints, offsetX, offsetY)
  }

  static addPoints(element: NonDeleted<ExcalidrawLinearElement>, appState: AppState, targetPoints: { point: Point }[]) {
    const offsetX = 0
    const offsetY = 0

    const nextPoints = [...element.points, ...targetPoints.map((x) => x.point)]
    LinearElementEditor._updatePoints(element, nextPoints, offsetX, offsetY)
  }

  static movePoints(
    element: NonDeleted<ExcalidrawLinearElement>,
    targetPoints: { index: number; point: Point; isDragging?: boolean }[],
    otherUpdates?: { startBinding?: PointBinding; endBinding?: PointBinding }
  ) {
    const { points } = element

    // in case we're moving start point, instead of modifying its position
    // which would break the invariant of it being at [0,0], we move
    // all the other points in the opposite direction by delta to
    // offset it. We do the same with actual element.x/y position, so
    // this hacks are completely transparent to the user.
    let offsetX = 0
    let offsetY = 0

    const selectedOriginPoint = targetPoints.find(({ index }) => index === 0)

    if (selectedOriginPoint) {
      offsetX = selectedOriginPoint.point[0] + points[selectedOriginPoint.index][0]
      offsetY = selectedOriginPoint.point[1] + points[selectedOriginPoint.index][1]
    }

    const nextPoints = points.map((point, idx) => {
      const selectedPointData = targetPoints.find((p) => p.index === idx)
      if (selectedPointData) {
        if (selectedOriginPoint) {
          return point
        }

        const deltaX = selectedPointData.point[0] - points[selectedPointData.index][0]
        const deltaY = selectedPointData.point[1] - points[selectedPointData.index][1]

        return [point[0] + deltaX, point[1] + deltaY] as const
      }
      return offsetX || offsetY ? ([point[0] - offsetX, point[1] - offsetY] as const) : point
    })

    LinearElementEditor._updatePoints(element, nextPoints, offsetX, offsetY, otherUpdates)
  }

  static shouldAddMidpoint(linearElementEditor: LinearElementEditor, pointerCoords: PointerCoords, appState: AppState) {
    const element = LinearElementEditor.getElement(linearElementEditor.elementId)

    if (!element) {
      return false
    }

    const { segmentMidpoint } = linearElementEditor.pointerDownState

    if (
      segmentMidpoint.added ||
      segmentMidpoint.value === null ||
      segmentMidpoint.index === null ||
      linearElementEditor.pointerDownState.origin === null
    ) {
      return false
    }

    const origin = linearElementEditor.pointerDownState.origin!
    const dist = distance2d(origin.x, origin.y, pointerCoords.x, pointerCoords.y)
    if (!appState.editingLinearElement && dist < DRAGGING_THRESHOLD / appState.zoom.value) {
      return false
    }
    return true
  }

  static addMidpoint(
    linearElementEditor: LinearElementEditor,
    pointerCoords: PointerCoords,
    appState: AppState,
    snapToGrid: boolean
  ) {
    const element = LinearElementEditor.getElement(linearElementEditor.elementId)
    if (!element) {
      return
    }
    const { segmentMidpoint } = linearElementEditor.pointerDownState
    const ret: {
      pointerDownState: LinearElementEditor['pointerDownState']
      selectedPointsIndices: LinearElementEditor['selectedPointsIndices']
    } = {
      pointerDownState: linearElementEditor.pointerDownState,
      selectedPointsIndices: linearElementEditor.selectedPointsIndices
    }

    const midpoint = LinearElementEditor.createPointAt(
      element,
      pointerCoords.x,
      pointerCoords.y,
      snapToGrid ? appState.gridSize : null
    )
    const points = [
      ...element.points.slice(0, segmentMidpoint.index!),
      midpoint,
      ...element.points.slice(segmentMidpoint.index!)
    ]

    mutateElement(element, {
      points
    })

    ret.pointerDownState = {
      ...linearElementEditor.pointerDownState,
      segmentMidpoint: {
        ...linearElementEditor.pointerDownState.segmentMidpoint,
        added: true
      },
      lastClickedPoint: segmentMidpoint.index!
    }
    ret.selectedPointsIndices = [segmentMidpoint.index!]
    return ret
  }

  private static _updatePoints(
    element: NonDeleted<ExcalidrawLinearElement>,
    nextPoints: readonly Point[],
    offsetX: number,
    offsetY: number,
    otherUpdates?: { startBinding?: PointBinding; endBinding?: PointBinding }
  ) {
    const nextCoords = getElementPointsCoords(element, nextPoints)
    const prevCoords = getElementPointsCoords(element, element.points)
    const nextCenterX = (nextCoords[0] + nextCoords[2]) / 2
    const nextCenterY = (nextCoords[1] + nextCoords[3]) / 2
    const prevCenterX = (prevCoords[0] + prevCoords[2]) / 2
    const prevCenterY = (prevCoords[1] + prevCoords[3]) / 2
    const dX = prevCenterX - nextCenterX
    const dY = prevCenterY - nextCenterY
    const rotated = rotate(offsetX, offsetY, dX, dY, element.angle)
    mutateElement(element, {
      ...otherUpdates,
      points: nextPoints,
      x: element.x + rotated[0],
      y: element.y + rotated[1]
    })
  }

  private static _getShiftLockedDelta(
    element: NonDeleted<ExcalidrawLinearElement>,
    referencePoint: Point,
    scenePointer: Point,
    gridSize: number | null
  ) {
    const referencePointCoords = LinearElementEditor.getPointGlobalCoordinates(element, referencePoint)

    const [gridX, gridY] = getGridPoint(scenePointer[0], scenePointer[1], gridSize)

    const { width, height } = getLockedLinearCursorAlignSize(
      referencePointCoords[0],
      referencePointCoords[1],
      gridX,
      gridY
    )

    return rotatePoint([width, height], [0, 0], -element.angle)
  }

  static getBoundTextElementPosition = (
    element: ExcalidrawLinearElement,
    boundTextElement: ExcalidrawTextElementWithContainer
  ): { x: number; y: number } => {
    const points = LinearElementEditor.getPointsGlobalCoordinates(element)
    if (points.length < 2) {
      mutateElement(boundTextElement, { isDeleted: true })
    }
    let x = 0
    let y = 0
    if (element.points.length % 2 === 1) {
      const index = Math.floor(element.points.length / 2)
      const midPoint = LinearElementEditor.getPointGlobalCoordinates(element, element.points[index])
      x = midPoint[0] - boundTextElement.width / 2
      y = midPoint[1] - boundTextElement.height / 2
    } else {
      const index = element.points.length / 2 - 1

      let midSegmentMidpoint = editorMidPointsCache.points[index]
      if (element.points.length === 2) {
        midSegmentMidpoint = centerPoint(points[0], points[1])
      }
      if (!midSegmentMidpoint || editorMidPointsCache.version !== element.version) {
        midSegmentMidpoint = LinearElementEditor.getSegmentMidPoint(
          element,
          points[index],
          points[index + 1],
          index + 1
        )
      }
      x = midSegmentMidpoint[0] - boundTextElement.width / 2
      y = midSegmentMidpoint[1] - boundTextElement.height / 2
    }
    return { x, y }
  }

  static getMinMaxXYWithBoundText = (
    element: ExcalidrawLinearElement,
    elementBounds: Bounds,
    boundTextElement: ExcalidrawTextElementWithContainer
  ): [number, number, number, number, number, number] => {
    let [x1, y1, x2, y2] = elementBounds
    const cx = (x1 + x2) / 2
    const cy = (y1 + y2) / 2
    const { x: boundTextX1, y: boundTextY1 } = LinearElementEditor.getBoundTextElementPosition(
      element,
      boundTextElement
    )
    const boundTextX2 = boundTextX1 + boundTextElement.width
    const boundTextY2 = boundTextY1 + boundTextElement.height

    const topLeftRotatedPoint = rotatePoint([x1, y1], [cx, cy], element.angle)
    const topRightRotatedPoint = rotatePoint([x2, y1], [cx, cy], element.angle)

    const counterRotateBoundTextTopLeft = rotatePoint(
      [boundTextX1, boundTextY1],

      [cx, cy],

      -element.angle
    )
    const counterRotateBoundTextTopRight = rotatePoint(
      [boundTextX2, boundTextY1],

      [cx, cy],

      -element.angle
    )
    const counterRotateBoundTextBottomLeft = rotatePoint(
      [boundTextX1, boundTextY2],

      [cx, cy],

      -element.angle
    )
    const counterRotateBoundTextBottomRight = rotatePoint(
      [boundTextX2, boundTextY2],

      [cx, cy],

      -element.angle
    )

    if (topLeftRotatedPoint[0] < topRightRotatedPoint[0] && topLeftRotatedPoint[1] >= topRightRotatedPoint[1]) {
      x1 = Math.min(x1, counterRotateBoundTextBottomLeft[0])
      x2 = Math.max(x2, Math.max(counterRotateBoundTextTopRight[0], counterRotateBoundTextBottomRight[0]))
      y1 = Math.min(y1, counterRotateBoundTextTopLeft[1])

      y2 = Math.max(y2, counterRotateBoundTextBottomRight[1])
    } else if (topLeftRotatedPoint[0] >= topRightRotatedPoint[0] && topLeftRotatedPoint[1] > topRightRotatedPoint[1]) {
      x1 = Math.min(x1, counterRotateBoundTextBottomRight[0])
      x2 = Math.max(x2, Math.max(counterRotateBoundTextTopLeft[0], counterRotateBoundTextTopRight[0]))
      y1 = Math.min(y1, counterRotateBoundTextBottomLeft[1])

      y2 = Math.max(y2, counterRotateBoundTextTopRight[1])
    } else if (topLeftRotatedPoint[0] >= topRightRotatedPoint[0]) {
      x1 = Math.min(x1, counterRotateBoundTextTopRight[0])
      x2 = Math.max(x2, counterRotateBoundTextBottomLeft[0])
      y1 = Math.min(y1, counterRotateBoundTextBottomRight[1])

      y2 = Math.max(y2, counterRotateBoundTextTopLeft[1])
    } else if (topLeftRotatedPoint[1] <= topRightRotatedPoint[1]) {
      x1 = Math.min(x1, Math.min(counterRotateBoundTextTopRight[0], counterRotateBoundTextTopLeft[0]))

      x2 = Math.max(x2, counterRotateBoundTextBottomRight[0])
      y1 = Math.min(y1, counterRotateBoundTextTopRight[1])
      y2 = Math.max(y2, counterRotateBoundTextBottomLeft[1])
    }

    return [x1, y1, x2, y2, cx, cy]
  }

  static getElementAbsoluteCoords = (
    element: ExcalidrawLinearElement,
    elementsMap: ElementsMap,
    includeBoundText: boolean = false
  ): [number, number, number, number, number, number] => {
    let coords: [number, number, number, number, number, number]
    let x1
    let y1
    let x2
    let y2
    if (element.points.length < 2 || !ShapeCache.get(element)) {
      // XXX this is just a poor estimate and not very useful
      const { minX, minY, maxX, maxY } = element.points.reduce(
        (limits, [x, y]) => {
          limits.minY = Math.min(limits.minY, y)
          limits.minX = Math.min(limits.minX, x)

          limits.maxX = Math.max(limits.maxX, x)
          limits.maxY = Math.max(limits.maxY, y)

          return limits
        },
        { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
      )
      x1 = minX + element.x
      y1 = minY + element.y
      x2 = maxX + element.x
      y2 = maxY + element.y
    } else {
      const shape = ShapeCache.generateElementShape(element, null)

      // first element is always the curve
      const ops = getCurvePathOps(shape[0])

      const [minX, minY, maxX, maxY] = getMinMaxXYFromCurvePathOps(ops)
      x1 = minX + element.x
      y1 = minY + element.y
      x2 = maxX + element.x
      y2 = maxY + element.y
    }
    const cx = (x1 + x2) / 2
    const cy = (y1 + y2) / 2
    coords = [x1, y1, x2, y2, cx, cy]

    if (!includeBoundText) {
      return coords
    }
    const boundTextElement = getBoundTextElement(element, elementsMap)
    if (boundTextElement) {
      coords = LinearElementEditor.getMinMaxXYWithBoundText(element, [x1, y1, x2, y2], boundTextElement)
    }

    return coords
  }
}
