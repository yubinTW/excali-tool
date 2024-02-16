import { hachureLines, Polygon } from '../../hachure-fill/hachure'
import { ResolvedOptions } from '../core'
import { Line, Point } from '../geometry'

export function polygonHachureLines(polygonList: Point[][], o: ResolvedOptions): Line[] {
  const angle = o.hachureAngle + 90
  let gap = o.hachureGap
  if (gap < 0) {
    gap = o.strokeWidth * 4
  }
  gap = Math.round(Math.max(gap, 0.1))
  let skipOffset = 1
  if (o.roughness >= 1) {
    if ((o.randomizer?.next() || Math.random()) > 0.7) {
      skipOffset = gap
    }
  }
  return hachureLines(polygonList as unknown as Polygon[], gap, angle, skipOffset || 1)
}
