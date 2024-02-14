import {
  ExcalidrawElement,
  ExcalidrawElementType,
  ExcalidrawSelectionElement,
  ExcalidrawTextElement,
  FontFamilyValues,
  PointBinding,
  StrokeRoundness
} from '../element/types'
import { AppState, BinaryFiles } from '../types'
import { getNormalizedDimensions } from '../element'
import { isTextElement, isUsingAdaptiveRadius } from '../element/typeChecks'
import { randomId } from '../random'
import {
  DEFAULT_FONT_FAMILY,
  DEFAULT_TEXT_ALIGN,
  DEFAULT_VERTICAL_ALIGN,
  PRECEDING_ELEMENT_KEY,
  FONT_FAMILY,
  ROUNDNESS,
  DEFAULT_ELEMENT_PROPS
} from '../constants'
import { LinearElementEditor } from '../element/linearElementEditor'
import { bumpVersion } from '../element/mutateElement'
import { getFontString, getUpdatedTimestamp } from '../utils'
import { Mutable } from '../utility-types'
import { detectLineHeight, getDefaultLineHeight, measureBaseline } from '../element/textElement'
import { normalizeLink } from './url'

type RestoredAppState = Omit<AppState, 'offsetTop' | 'offsetLeft' | 'width' | 'height'>

export const AllowedExcalidrawActiveTools: Record<AppState['activeTool']['type'], boolean> = {
  selection: true,
  text: true,
  rectangle: true,
  diamond: true,
  ellipse: true,
  line: true,
  image: true,
  arrow: true,
  freedraw: true,
  eraser: false,
  custom: true,
  frame: true,
  embeddable: true,
  hand: true,
  laser: false,
  magicframe: false
}

export type RestoredDataState = {
  elements: ExcalidrawElement[]
  appState: RestoredAppState
  files: BinaryFiles
}

const getFontFamilyByName = (fontFamilyName: string): FontFamilyValues => {
  if (Object.keys(FONT_FAMILY).includes(fontFamilyName)) {
    return FONT_FAMILY[fontFamilyName as keyof typeof FONT_FAMILY] as FontFamilyValues
  }
  return DEFAULT_FONT_FAMILY
}

const repairBinding = (binding: PointBinding | null) => {
  if (!binding) {
    return null
  }
  return { ...binding, focus: binding.focus || 0 }
}

const restoreElementWithProperties = <
  T extends Required<Omit<ExcalidrawElement, 'customData'>> & {
    customData?: ExcalidrawElement['customData']
    /** @deprecated */
    boundElementIds?: readonly ExcalidrawElement['id'][]
    /** @deprecated */
    strokeSharpness?: StrokeRoundness
    /** metadata that may be present in elements during collaboration */
    [PRECEDING_ELEMENT_KEY]?: string
  },
  K extends Pick<T, keyof Omit<Required<T>, keyof ExcalidrawElement>>
>(
  element: T,
  extra: Pick<
    T,
    // This extra Pick<T, keyof K> ensure no excess properties are passed.
    // @ts-ignore TS complains here but type checks the call sites fine.
    keyof K
  > &
    Partial<Pick<ExcalidrawElement, 'type' | 'x' | 'y' | 'customData'>>
): T => {
  const base: Pick<T, keyof ExcalidrawElement> & {
    [PRECEDING_ELEMENT_KEY]?: string
  } = {
    type: extra.type || element.type,
    // all elements must have version > 0 so getSceneVersion() will pick up
    // newly added elements
    version: element.version || 1,
    versionNonce: element.versionNonce ?? 0,
    isDeleted: element.isDeleted ?? false,
    id: element.id || randomId(),
    fillStyle: element.fillStyle || DEFAULT_ELEMENT_PROPS.fillStyle,
    strokeWidth: element.strokeWidth || DEFAULT_ELEMENT_PROPS.strokeWidth,
    strokeStyle: element.strokeStyle ?? DEFAULT_ELEMENT_PROPS.strokeStyle,
    roughness: element.roughness ?? DEFAULT_ELEMENT_PROPS.roughness,
    opacity: element.opacity == null ? DEFAULT_ELEMENT_PROPS.opacity : element.opacity,
    angle: element.angle || 0,
    x: extra.x ?? element.x ?? 0,
    y: extra.y ?? element.y ?? 0,
    strokeColor: element.strokeColor || DEFAULT_ELEMENT_PROPS.strokeColor,
    backgroundColor: element.backgroundColor || DEFAULT_ELEMENT_PROPS.backgroundColor,
    width: element.width || 0,
    height: element.height || 0,
    seed: element.seed ?? 1,
    groupIds: element.groupIds ?? [],
    frameId: element.frameId ?? null,
    roundness: element.roundness
      ? element.roundness
      : element.strokeSharpness === 'round'
        ? {
            // for old elements that would now use adaptive radius algo,
            // use legacy algo instead
            type: isUsingAdaptiveRadius(element.type) ? ROUNDNESS.LEGACY : ROUNDNESS.PROPORTIONAL_RADIUS
          }
        : null,
    boundElements: element.boundElementIds
      ? element.boundElementIds.map((id) => ({ type: 'arrow', id }))
      : element.boundElements ?? [],
    updated: element.updated ?? getUpdatedTimestamp(),
    link: element.link ? normalizeLink(element.link) : null,
    locked: element.locked ?? false
  }

  if ('customData' in element || 'customData' in extra) {
    base.customData = 'customData' in extra ? extra.customData : element.customData
  }

  if (PRECEDING_ELEMENT_KEY in element) {
    base[PRECEDING_ELEMENT_KEY] = element[PRECEDING_ELEMENT_KEY]
  }

  return {
    ...base,
    ...getNormalizedDimensions(base),
    ...extra
  } as unknown as T
}

const restoreElement = (element: Exclude<ExcalidrawElement, ExcalidrawSelectionElement>): typeof element | null => {
  switch (element.type) {
    case 'text':
      let fontSize = element.fontSize
      let fontFamily = element.fontFamily
      if ('font' in element) {
        const [fontPx, _fontFamily]: [string, string] = (element as any).font.split(' ')
        fontSize = parseFloat(fontPx)
        fontFamily = getFontFamilyByName(_fontFamily)
      }
      const text = (typeof element.text === 'string' && element.text) || ''

      // line-height might not be specified either when creating elements
      // programmatically, or when importing old diagrams.
      // For the latter we want to detect the original line height which
      // will likely differ from our per-font fixed line height we now use,
      // to maintain backward compatibility.
      const lineHeight =
        element.lineHeight ||
        (element.height
          ? // detect line-height from current element height and font-size
            detectLineHeight(element)
          : // no element height likely means programmatic use, so default
            // to a fixed line height
            getDefaultLineHeight(element.fontFamily))
      const baseline = measureBaseline(element.text, getFontString(element), lineHeight)
      element = restoreElementWithProperties(element, {
        fontSize,
        fontFamily,
        text,
        textAlign: element.textAlign || DEFAULT_TEXT_ALIGN,
        verticalAlign: element.verticalAlign || DEFAULT_VERTICAL_ALIGN,
        containerId: element.containerId ?? null,
        originalText: element.originalText || text,

        lineHeight,
        baseline
      })

      // if empty text, mark as deleted. We keep in array
      // for data integrity purposes (collab etc.)
      if (!text && !element.isDeleted) {
        element = { ...element, originalText: text, isDeleted: true }
        element = bumpVersion(element)
      }

      return element
    case 'freedraw': {
      return restoreElementWithProperties(element, {
        points: element.points,
        lastCommittedPoint: null,
        simulatePressure: element.simulatePressure,
        pressures: element.pressures
      })
    }
    case 'image':
      return restoreElementWithProperties(element, {
        status: element.status || 'pending',
        fileId: element.fileId,
        scale: element.scale || [1, 1]
      })
    case 'line':
    // @ts-ignore LEGACY type
    // eslint-disable-next-line no-fallthrough
    case 'draw':
    case 'arrow': {
      const { startArrowhead = null, endArrowhead = element.type === 'arrow' ? 'arrow' : null } = element
      let x = element.x
      let y = element.y
      let points = // migrate old arrow model to new one
        !Array.isArray(element.points) || element.points.length < 2
          ? [
              [0, 0],
              [element.width, element.height]
            ]
          : element.points

      if (points[0][0] !== 0 || points[0][1] !== 0) {
        ;({ points, x, y } = LinearElementEditor.getNormalizedPoints(element))
      }

      return restoreElementWithProperties(element, {
        type: (element.type as ExcalidrawElementType | 'draw') === 'draw' ? 'line' : element.type,
        startBinding: repairBinding(element.startBinding),
        endBinding: repairBinding(element.endBinding),
        lastCommittedPoint: null,
        startArrowhead,
        endArrowhead,
        points,
        x,
        y
      })
    }

    // generic elements
    case 'ellipse':
    case 'rectangle':
    case 'diamond':
    case 'embeddable':
      return restoreElementWithProperties(element, {})
    case 'magicframe':
    case 'frame':
      return restoreElementWithProperties(element, {
        name: element.name ?? null
      })

    // Don't use default case so as to catch a missing an element type case.
    // We also don't want to throw, but instead return void so we filter
    // out these unsupported elements from the restored array.
  }
  return null
}

/**
 * Repairs contaienr element's boundElements array by removing duplicates and
 * fixing containerId of bound elements if not present. Also removes any
 * bound elements that do not exist in the elements array.
 *
 * NOTE mutates elements.
 */
const repairContainerElement = (
  container: Mutable<ExcalidrawElement>,
  elementsMap: Map<string, Mutable<ExcalidrawElement>>
) => {
  if (container.boundElements) {
    // copy because we're not cloning on restore, and we don't want to mutate upstream
    const boundElements = container.boundElements.slice()

    // dedupe bindings & fix boundElement.containerId if not set already
    const boundIds = new Set<ExcalidrawElement['id']>()
    container.boundElements = boundElements.reduce(
      (acc: Mutable<NonNullable<ExcalidrawElement['boundElements']>>, binding) => {
        const boundElement = elementsMap.get(binding.id)
        if (boundElement && !boundIds.has(binding.id)) {
          boundIds.add(binding.id)

          if (boundElement.isDeleted) {
            return acc
          }

          acc.push(binding)

          if (
            isTextElement(boundElement) &&
            // being slightly conservative here, preserving existing containerId
            // if defined, lest boundElements is stale
            !boundElement.containerId
          ) {
            ;(boundElement as Mutable<ExcalidrawTextElement>).containerId = container.id
          }
        }
        return acc
      },
      []
    )
  }
}

/**
 * Repairs target bound element's container's boundElements array,
 * or removes contaienrId if container does not exist.
 *
 * NOTE mutates elements.
 */
const repairBoundElement = (
  boundElement: Mutable<ExcalidrawTextElement>,
  elementsMap: Map<string, Mutable<ExcalidrawElement>>
) => {
  const container = boundElement.containerId ? elementsMap.get(boundElement.containerId) : null

  if (!container) {
    boundElement.containerId = null
    return
  }

  if (boundElement.isDeleted) {
    return
  }

  if (container.boundElements && !container.boundElements.find((binding) => binding.id === boundElement.id)) {
    // copy because we're not cloning on restore, and we don't want to mutate upstream
    const boundElements = (container.boundElements || (container.boundElements = [])).slice()
    boundElements.push({ type: 'text', id: boundElement.id })
    container.boundElements = boundElements
  }
}

/**
 * Remove an element's frameId if its containing frame is non-existent
 *
 * NOTE mutates elements.
 */
const repairFrameMembership = (
  element: Mutable<ExcalidrawElement>,
  elementsMap: Map<string, Mutable<ExcalidrawElement>>
) => {
  if (element.frameId) {
    const containingFrame = elementsMap.get(element.frameId)

    if (!containingFrame) {
      element.frameId = null
    }
  }
}
