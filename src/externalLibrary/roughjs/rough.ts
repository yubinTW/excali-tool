import { Canvas } from '@napi-rs/canvas'
import { RoughCanvas } from './canvas'
import { Config } from './core'
import { RoughGenerator } from './generator'
import { RoughSVG } from './svg'

export default {
  canvas(canvas: Canvas, config?: Config): RoughCanvas {
    return new RoughCanvas(canvas, config)
  },

  svg(svg: SVGSVGElement, config?: Config): RoughSVG {
    return new RoughSVG(svg, config)
  },

  generator(config?: Config): RoughGenerator {
    return new RoughGenerator(config)
  },

  newSeed(): number {
    return RoughGenerator.newSeed()
  }
}
