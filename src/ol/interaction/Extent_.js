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

const createContext = event => {
  if (event && event.map) {
    event.context = context({ map: event.map })
  }
  return event
}

// Find the extent corner opposite the passed corner.
const opposingPoint = point => { 
  let x_ = null
  let y_ = null

  if (point[0] == extent[0]) x_ = extent[2];
  else if (point[0] == extent[2]) x_ = extent[0]

  if (point[1] == extent[1]) y_ = extent[3]
  else if (point[1] == extent[3]) y_ = extent[1]

  return x_ !== null && y_ !== null
    ? [x_, y_]
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

const vertexOverlay = (map, options) => {
  const style = options.pointerStyle || createEditingStyle()['Point']
  const layer = createOverlay(map, options, style)
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

const extentOverlay = (map, options) => {
  const style = options.pointerStyle || createEditingStyle()['Polygon']
  const layer = createOverlay(map, options, style)
  const feature = new Feature()
  layer.getSource().addFeature(feature)
  let segments

  const update = extent => {
    feature.setGeometry(polygonFromExtent(extent))
    segments = [
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

  const snap = event => {
    const { context } = event
    const byDistance = (a, b) => 
      squaredDistanceToSegment(event.coordinate, a) -
      squaredDistanceToSegment(event.coordinate, b)
  
    // Convert extents to line segments and 
    // find the segment closest to pixelCoordinate.
    segments.sort(byDistance)
    const closestSegment = segments[0]
  
    let vertex = closestOnSegment(event.coordinate, closestSegment)
    const vertexPixel = context.pixelFromCoordinateInternal(vertex)
  
    // If the distance is within tolerance, snap to the segment.
    if (coordinateDistance(event.pixel, vertexPixel) <= options.pixelTolerance) {
      const pixel1 = context.pixelFromCoordinateInternal(closestSegment[0])
      const pixel2 = context.pixelFromCoordinateInternal(closestSegment[1])
      const squaredDist1 = squaredCoordinateDistance(vertexPixel, pixel1)
      const squaredDist2 = squaredCoordinateDistance(vertexPixel, pixel2)
      const dist = Math.sqrt(Math.min(squaredDist1, squaredDist2))
      const snapped = dist <= options.pixelTolerance
      if (snapped) vertex = squaredDist1 > squaredDist2 
        ? closestSegment[1] 
        : closestSegment[0]

      return vertex
    } else return null
  }

  return {
    update,
    area,
    snap,
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

const idle = options => ({
  pointermove: event => {
    return [event]
  },
  pointerdown: event => {
    return [event, drawExtent(options, { 
      vertexOverlay: vertexOverlay(event.map, options),
      extentOverlay: extentOverlay(event.map, options),
      startCoordinate: event.coordinate
    })]
  }
})

const drawExtent = (options, args) => {
  const { vertexOverlay, extentOverlay, startCoordinate } = args
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
        ? [event, idle(options)] 
        : [event, modifyExtent(options, args)]
    }
  }
}

const modifyExtent = (options, args) => {
  const { vertexOverlay, extentOverlay } = args  
  return {
    pointermove: event => {
      const coordinate = extentOverlay.snap(event) || event.coordinate
      vertexOverlay.update(coordinate)
      return [event]
    },
    pointerdown: event => {
      const snapped = extentOverlay.snap(event)
      console.log('snapped', snapped)
      return [event]
    }
  }
}

export default options => {
  return R.compose(
    fsm(idle({
      ...options,
      pixelTolerance: options.pixelTolerance === undefined ? 10 : options.pixelTolerance,
      condition: options.condition || always
    })),
    createContext
  )
}