import * as flyd from 'flyd'
import { always } from '../events/condition.js'
import { toUserExtent } from '../proj.js'
import { context } from './Interaction.js'
import fsm from './fsm.js'
import { extentOverlay, vertexOverlay } from './Extent.fns.js'
import { pointHandler, edgeHandler } from './Extent.fns.js'
import { segments, polygon } from './Extent.fns.js'
import { snap, oppositeVertex } from './Extent.fns.js'

const state = ctx => ({
  pointermove: event => {
    ctx.event(event)
    ctx.vertex(ctx.snappedVertex() || event.coordinate)
    return [event]
  },

  pointerdown: event => {
    ctx.event(event)

    if (ctx.extent() && ctx.snappedVertex()) {
      const extent = ctx.extent()
      const vertex = ctx.snappedVertex()
      const x = vertex[0] == extent[0] || vertex[0] == extent[2] ? vertex[0] : null
      const y = vertex[1] == extent[1] || vertex[1] == extent[3] ? vertex[1] : null

      if (x !== null && y !== null) {
        ctx.$handler(pointHandler(oppositeVertex(extent, vertex)))
      } else if (x !== null) {
        ctx.$handler(edgeHandler(
          oppositeVertex(extent, [x, extent[1]]),
          oppositeVertex(extent, [x, extent[3]])
        ))
      } else if (y !== null) {
        ctx.$handler(edgeHandler(
          oppositeVertex(extent, [extent[0], y]),
          oppositeVertex(extent, [extent[2], y])
        ))
      }
    } else {
      ctx.$handler(pointHandler(event.coordinate))
    }

    return [event]
  },

  pointerdrag: event => {
    ctx.extent(ctx.$handler()(event.coordinate))
    return [event]
  }
})

export default options => map => {
  const opts = options || {}
  opts.pixelTolerance = opts.pixelTolerance === undefined ? 10 : opts.pixelTolerance
  opts.condition = opts.condition || always

  const ctx = context({ map })
  ctx.extent = flyd.stream()
  ctx.vertex = flyd.stream()
  ctx.event = flyd.stream()
  ctx.$handler = flyd.stream()

  const $segments = ctx.extent.map(segments) // A.K.A flyd.map(fn, s)
  const $polygon = ctx.extent.map(polygon)
    
  ctx.snappedVertex = flyd.combine(($event, $segments) => {
    return snap(ctx, opts)($event(), $segments())
  }, [ctx.event, $segments])

  // TODO: dispose
  const extentOverlay_ = extentOverlay(ctx, opts)
  const vertexOverlay_ = vertexOverlay(ctx, opts)

  // Side-effects: vertex/extent overlay
  flyd.on(vertexOverlay_.update, ctx.vertex)
  flyd.on(extentOverlay_.update, $polygon)

  return fsm(state(ctx))
}
