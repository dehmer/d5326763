import * as R from 'ramda'
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

// Find the extent corner opposite the passed corner.
const opposingPoint = extent => point => { 
  const x = point[0] == extent[0]
    ? extent[2]
    : point[0] == extent[2]
      ? extent[0]
      : null

  const y = point[1] == extent[1]
    ? extent[3]
    : point[1] == extent[3]
      ? extent[1]
      : null

  return x !== null && y !== null
    ? [x, y]
    : null
}


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
  let extent_
  let segments_
  let opposingPoint_

  const update = extent => {
    feature.setGeometry(polygonFromExtent(extent))
    extent_ = extent
    opposingPoint_ = opposingPoint(extent)
    segments_ = [
      [[extent[0], extent[1]], [extent[0], extent[3]]],
      [[extent[0], extent[3]], [extent[2], extent[3]]],
      [[extent[2], extent[3]], [extent[2], extent[1]]],
      [[extent[2], extent[1]], [extent[0], extent[1]]]
    ]
  }

  const area = () => feature.getGeometry()?.getArea() || 0

  const dispose = () => {
    layer.getSource().clear()
    layer.getSource().dispose()
    layer.setMap(null)
    layer.dispose()
  }

  /**
   * Snap event coordinate to extent vertex or segment.
   */
  const snap = event => {
    const byDistance = (a, b) => 
      squaredDistanceToSegment(event.coordinate, a) -
      squaredDistanceToSegment(event.coordinate, b)
  
    // Convert extents to line segments and 
    // find the segment closest to pixelCoordinate.
    segments_.sort(byDistance)
    const closestSegment = segments_[0]
  
    const vertex = closestOnSegment(event.coordinate, closestSegment)
    const pixel = ctx.pixelFromCoordinateInternal(vertex)
  
    if (coordinateDistance(event.pixel, pixel) > options.pixelTolerance) return null

    // If the distance is within tolerance, snap to the segment.
    const pixel1 = ctx.pixelFromCoordinateInternal(closestSegment[0])
    const pixel2 = ctx.pixelFromCoordinateInternal(closestSegment[1])
    const squaredDist1 = squaredCoordinateDistance(pixel, pixel1)
    const squaredDist2 = squaredCoordinateDistance(pixel, pixel2)
    const dist = Math.sqrt(Math.min(squaredDist1, squaredDist2))
    return dist <= options.pixelTolerance
      ? squaredDist1 > squaredDist2 
        ? closestSegment[1] 
        : closestSegment[0]
      : vertex
  }

  return {
    update,
    area,
    snap,
    opposingPoint: point => {
      if (!point) return null
      else if (!opposingPoint_) return null
      else if (!extent_) return null
      else return opposingPoint_(point)
    },
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

const idle = (ctx, opts) => () => ({
  pointermove: event => {
    return [event]
  },
  pointerdown: event => {
    const startCoordinate = event.coordinate 
    return [event, ctx.drawExtent({ startCoordinate })]
  }
})

const drawExtent = (ctx, opts) => args => {
  const { vertexOverlay, extentOverlay } = ctx
  const { startCoordinate } = args
  return {
    pointerdrag: event => {
      // Note: `event.coordinate` is equivalent to
      // `map.getCoordinateFromPixelInternal(event.pixel)`  
      vertexOverlay.update(event.coordinate)
      extentOverlay.update(boundingExtent([startCoordinate, event.coordinate]))
      return [event]
    },
    pointerup: event => {
      const area = extentOverlay.area()
      if (area === 0) vertexOverlay.dispose()
      return area === 0 
        ? [event, ctx.idle()] 
        : [event, ctx.modifyExtent(args)]
    }
  }
}

const modifyExtent = (ctx, opts) => () => {
  const { vertexOverlay, extentOverlay } = ctx  
  return {
    pointermove: event => {
      const coordinate = extentOverlay.snap(event) || event.coordinate
      vertexOverlay.update(coordinate)
      return [event]
    },
    pointerdown: event => {
      const snapped = extentOverlay.snap(event)
      const opposingPoint = extentOverlay.opposingPoint(snapped)
      console.log('snapped', snapped, opposingPoint)
      return [event]
    }
  }
}

export default options => map => {
  console.log('extent_', map, options)
  const opts = options || {}
  opts.pixelTolerance = opts.pixelTolerance === undefined ? 10 : opts.pixelTolerance
  opts.condition = opts.condition || always

  const ctx = context({ map })
  ctx.extentOverlay = extentOverlay(ctx, opts)
  ctx.vertexOverlay = vertexOverlay(ctx, opts)
  ctx.idle = idle(ctx, opts)
  ctx.drawExtent = drawExtent(ctx, opts)
  ctx.modifyExtent = modifyExtent(ctx, opts)

  return R.compose(fsm(ctx.idle(opts)))
}