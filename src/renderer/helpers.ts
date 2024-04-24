/* eslint-disable @typescript-eslint/no-unused-vars */
import { AppState, StaticCanvasAppState } from '../types'
import { Canvas, SKRSContext2D, createCanvas } from '@napi-rs/canvas'

export const fillCircle = (context: SKRSContext2D, cx: number, cy: number, radius: number, stroke = true) => {
  context.beginPath()
  context.arc(cx, cy, radius, 0, Math.PI * 2)
  context.fill()
  if (stroke) {
    context.stroke()
  }
}

export const getNormalizedCanvasDimensions = (canvas: Canvas, scale: number): [number, number] => {
  // When doing calculations based on canvas width we should used normalized one
  return [canvas.width / scale, canvas.height / scale]
}

export const bootstrapCanvas = ({
  canvas,
  scale,
  normalizedWidth,
  normalizedHeight,
  theme,
  isExporting,
  viewBackgroundColor
}: {
  canvas: Canvas
  scale: number
  normalizedWidth: number
  normalizedHeight: number
  theme?: AppState['theme']
  isExporting?: any // StaticCanvasRenderConfig['isExporting']
  viewBackgroundColor?: StaticCanvasAppState['viewBackgroundColor']
}): SKRSContext2D => {
  const context = createCanvas(canvas.width, canvas.height).getContext('2d')

  context.setTransform(1, 0, 0, 1, 0, 0)
  context.scale(scale, scale)

  // if (isExporting && theme === THEME.DARK) {
  //   context.filter = THEME_FILTER
  // }

  // Paint background
  if (typeof viewBackgroundColor === 'string') {
    const hasTransparence =
      viewBackgroundColor === 'transparent' ||
      viewBackgroundColor.length === 5 || // #RGBA
      viewBackgroundColor.length === 9 || // #RRGGBBA
      /(hsla|rgba)\(/.test(viewBackgroundColor)
    if (hasTransparence) {
      context.clearRect(0, 0, normalizedWidth, normalizedHeight)
    }
    context.save()
    context.fillStyle = viewBackgroundColor
    context.fillRect(0, 0, normalizedWidth, normalizedHeight)
    context.restore()
  } else {
    context.clearRect(0, 0, normalizedWidth, normalizedHeight)
  }

  return context
}
