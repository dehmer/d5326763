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

const modifyExtent = ctx => () => ({
  pointermove: event => {
    ctx.event(event)
    const coordinate = ctx.snappedCoordinate() || event.coordinate
    ctx.vertex(coordinate)
    return [event]
  },
  pointerdown: event => {
    ctx.event(event)
    console.log('snappedCoordinate', ctx.snappedCoordinate())
    console.log('oppositeVertex', ctx.oppositeVertex())
    // TODO: ...
    return [event]
  }
})

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

  const segments = flyd.combine($extent => {
    if (!$extent()) return null
    const [x1, y1, x2, y2] = $extent()
    return [
      [[x1, y1], [x1, y2]],
      [[x1, y2], [x2, y2]],
      [[x2, y2], [x2, y1]],
      [[x2, y1], [x1, y1]]
    ]
  }, [ctx.extent])

  // TODO: can probably be local
  ctx.oppositeVertex = flyd.combine(($extent, $vertex) => {
    const [extent, vertex] = [$extent(), $vertex()]
    return extent && vertex
      ? opposingPoint(extent, vertex)
      : null
  }, [ctx.extent, ctx.vertex])
    
  const polygon = flyd.combine($extent => {
    return $extent() ? polygonFromExtent($extent()) : null
  }, [ctx.extent])

  ctx.area = flyd.combine($polygon => {
    return $polygon() ? $polygon().getArea() : 0
  }, [polygon])

  const byDistance = coordinate => (a, b) => 
    squaredDistanceToSegment(coordinate, a) -
    squaredDistanceToSegment(coordinate, b)

  // TODO: extract function
  ctx.snappedCoordinate = flyd.combine(($event, $segments) => {
    if (!$event()) return null
    if (!$segments()) return null

    // Convert extents to line segments and 
    // find the segment closest to pixelCoordinate.
    const { coordinate, pixel } = $event() // FIXME: coordinate/pixel are redundant
    const segments = R.sort(byDistance(coordinate), $segments())
    const closestSegment = segments[0]  
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
  }, [ctx.event, segments])

  // TODO: dispose
  const extentOverlay_ = extentOverlay(ctx, opts)
  const vertexOverlay_ = vertexOverlay(ctx, opts)

  // Side-effects: vertex/extent overlay
  flyd.combine($vertex => vertexOverlay_.update($vertex()), [ctx.vertex])
  flyd.combine($polygon => extentOverlay_.update($polygon()), [polygon])

  return R.compose(fsm(ctx.idle(opts)))
}

const opposingPoint = (extent, vertex) => {
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
}
