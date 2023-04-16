import * as R from 'ramda'
import * as flyd from 'flyd'
import Event from '../events/Event.js'
import Feature from '../Feature.js'
import MapBrowserEventType from '../MapBrowserEventType.js'
import Point from '../geom/Point.js'
import PointerInteraction from './Pointer.js'
import VectorLayer from '../layer/Vector.js'
import VectorSource from '../source/Vector.js'
import { always } from '../events/condition.js'
import { boundingExtent } from '../extent.js'
import {
  closestOnSegment,
  distance as coordinateDistance,
  squaredDistance as squaredCoordinateDistance,
  squaredDistanceToSegment,
} from '../coordinate.js'
import { createEditingStyle } from '../style/Style.js'
import { fromExtent as polygonFromExtent } from '../geom/Polygon.js'
import { toUserExtent } from '../proj.js'
import { context } from './Interaction.js'

const createOverlay = (map, options, style) => new VectorLayer({
  map,
  style,
  source: new VectorSource({
    useSpatialIndex: false,
    wrapX: !!options.wrapX
  }),
  updateWhileAnimating: true,
  updateWhileInteracting: true
})

const vertexOverlay = (ctx, options) => {
  const style = options.pointerStyle || createEditingStyle()['Point']
  const layer = createOverlay(ctx.map, options, style)
  const feature = new Feature()
  layer.getSource().addFeature(feature)
  const update = coordinates => feature.setGeometry(new Point(coordinates))

  const dispose = () => {
    layer.getSource().clear()
    layer.getSource().dispose()
    layer.setMap(null)
    layer.dispose()
  }

  return {
    update,
    dispose
  }
}

const extentOverlay = (ctx, options) => {
  const style = options.pointerStyle || createEditingStyle()['Polygon']
  const layer = createOverlay(ctx.map, options, style)
  const feature = new Feature()
  layer.getSource().addFeature(feature)
  const update = polygon => feature.setGeometry(polygon)

  const dispose = () => {
    layer.getSource().clear()
    layer.getSource().dispose()
    layer.setMap(null)
    layer.dispose()
  }

  return {
    update,
    dispose
  }
}

const fsm = initial => {
  let current = initial

  return event => {
    if (event?.type && current[event.type]) {
      const result = current[event.type](event)
      if (result.length === 2) current = result[1]
      return result[0]
    } else return event
  }
}

const idle = ctx => () => ({
  pointermove: event => {
    ctx.vertex(event.coordinate)
    return [event]
  },
  pointerdown: event => {
    const startCoordinate = event.coordinate 
    return [event, ctx.drawExtent({ startCoordinate })]
  }
})

const drawExtent = ctx => ({ startCoordinate }) => ({
  pointerdrag: event => {
    // Note: `event.coordinate` is equivalent to
    // `map.getCoordinateFromPixelInternal(event.pixel)`
    ctx.vertex(event.coordinate)
    // TODO: use handler function
    const extent = boundingExtent([startCoordinate, event.coordinate])
    ctx.extent(extent)
    return [event]
  },
  pointerup: event => {
    return ctx.area()
      ? [event, ctx.modifyExtent()]
      : [event, ctx.idle()] 
  }
})

const pointHandler = a => x => boundingExtent([a, x])

const edgeHandler = (a, b) => {
  if (a[0] === b[0]) return x => boundingExtent([a, [x[0], b[1]]])
  else if (a[1] === b[1]) return x => boundingExtent([a, [b[0], x[1]]])
  else return () => null
}

const modifyExtent = ctx => () => ({
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
        ctx.handler(pointHandler(Extent.oppositeVertex(extent, vertex)))
      } else if (x !== null) {
        ctx.handler(edgeHandler(
          Extent.oppositeVertex(extent, [x, extent[1]]),
          Extent.oppositeVertex(extent, [x, extent[3]])
        ))
      } else if (y !== null) {
        ctx.handler(edgeHandler(
          Extent.oppositeVertex(extent, [extent[0], y]),
          Extent.oppositeVertex(extent, [extent[2], y])
        ))
      }
    } else {
      ctx.extent(null)
      ctx.handler(pointHandler(event.coordinate))
    }

    // TODO: ...
    return [event]
  },

  pointerdrag: event => {
    ctx.extent(ctx.handler()(event.coordinate))
    return [event]
  }
})

const compareDistance = coordinate => 
  (a, b) => 
    squaredDistanceToSegment(coordinate, a) -
    squaredDistanceToSegment(coordinate, b)

const Extent = {
  polygon: extent => extent ? polygonFromExtent(extent) : null,
  area: polygon => polygon ? polygon.getArea() : 0,

  segments: extent => 
    extent
      ? [
          [[extent[0], extent[1]], [extent[0], extent[3]]],
          [[extent[0], extent[3]], [extent[2], extent[3]]],
          [[extent[2], extent[3]], [extent[2], extent[1]]],
          [[extent[2], extent[1]], [extent[0], extent[1]]]
        ]
      : null,

  oppositeVertex: (extent, vertex) => {
    if (!extent || !vertex) return null

    const x = vertex[0] == extent[0]
      ? extent[2]
      : vertex[0] == extent[2]
        ? extent[0]
        : null
  
    const y = vertex[1] == extent[1]
      ? extent[3]
      : vertex[1] == extent[3]
        ? extent[1]
        : null
  
    return x !== null && y !== null ? [x, y] : null
  },

  snap: (ctx, options) => (event, segments) => {
    if (!event || !segments) return null

    // Convert extents to line segments and 
    // find the segment closest to pixelCoordinate.
    const { coordinate, pixel } = event // FIXME: coordinate/pixel are redundant
    const closestSegment = R.sort(compareDistance(coordinate), segments)[0]  
    const vertex = closestOnSegment(coordinate, closestSegment)
    const vertexPixel = ctx.pixelFromCoordinateInternal(vertex)
  
    if (coordinateDistance(pixel, vertexPixel) > options.pixelTolerance) {
      return null
    }

    // If the distance is within tolerance, snap to the segment.
    const pixel1 = ctx.pixelFromCoordinateInternal(closestSegment[0])
    const pixel2 = ctx.pixelFromCoordinateInternal(closestSegment[1])
    const squaredDist1 = squaredCoordinateDistance(vertexPixel, pixel1)
    const squaredDist2 = squaredCoordinateDistance(vertexPixel, pixel2)
    const dist = Math.sqrt(Math.min(squaredDist1, squaredDist2))
    return dist <= options.pixelTolerance
      ? squaredDist1 > squaredDist2 
        ? closestSegment[1] 
        : closestSegment[0]
      : vertex
  }
}

export default options => map => {
  const opts = options || {}
  opts.pixelTolerance = opts.pixelTolerance === undefined ? 10 : opts.pixelTolerance
  opts.condition = opts.condition || always

  const ctx = context({ map })
  ctx.idle = idle(ctx, opts)
  ctx.drawExtent = drawExtent(ctx, opts)
  ctx.modifyExtent = modifyExtent(ctx, opts)

  ctx.extent = flyd.stream()
  ctx.vertex = flyd.stream()
  ctx.event = flyd.stream()
  ctx.handler = flyd.stream()

  const snap = Extent.snap(ctx, opts)
  const segments = ctx.extent.map(Extent.segments) // A.K.A flyd.map(fn, s)
  const polygon = ctx.extent.map(Extent.polygon)
  ctx.area = polygon.map(Extent.area)

  // TODO: can probably be local
  ctx.oppositeVertex = flyd.combine(($extent, $vertex) => {
    return Extent.oppositeVertex($extent(), $vertex())
  }, [ctx.extent, ctx.vertex])
    
  ctx.snappedVertex = flyd.combine(($event, $segments) => {
    return snap($event(), $segments())
  }, [ctx.event, segments])

  // TODO: dispose
  const extentOverlay_ = extentOverlay(ctx, opts)
  const vertexOverlay_ = vertexOverlay(ctx, opts)

  // Side-effects: vertex/extent overlay
  flyd.on(vertexOverlay_.update, ctx.vertex)
  flyd.on(extentOverlay_.update, polygon)

  return fsm(ctx.idle(opts))
}
