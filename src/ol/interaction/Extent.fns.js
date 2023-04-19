import * as R from 'ramda'
import Feature from '../Feature.js'
import Point from '../geom/Point.js'
import VectorLayer from '../layer/Vector.js'
import VectorSource from '../source/Vector.js'
import { createEditingStyle } from '../style/Style.js'
import { boundingExtent } from '../extent.js'
import {
  closestOnSegment,
  distance as coordinateDistance,
  squaredDistance as squaredCoordinateDistance,
  squaredDistanceToSegment,
} from '../coordinate.js'
import { fromExtent as polygonFromExtent } from '../geom/Polygon.js'
import { context } from './Interaction.js'

/**
 * 
 */
const overlay = (map, options, style) => new VectorLayer({
  map,
  style,
  source: new VectorSource({
    useSpatialIndex: false,
    wrapX: !!options.wrapX
  }),
  updateWhileAnimating: true,
  updateWhileInteracting: true
})

/**
 * 
 */
export const vertexOverlay = (map, options) => {
  const style = options.pointerStyle || createEditingStyle()['Point']
  const layer = overlay(map, options, style)
  const feature = new Feature()
  layer.getSource().addFeature(feature)
  const update = coordinates => coordinates 
    ? feature.setGeometry(new Point(coordinates))
    : feature.setGeometry(null)

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

/**
 * 
 */
export const extentOverlay = (map, options) => {
  const style = options.pointerStyle || createEditingStyle()['Polygon']
  const layer = overlay(map, options, style)
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

export const dragHandler = ({ extent, vertex, coordinate }) => {
  if (extent && vertex) {
    const x = vertex[0] == extent[0] || vertex[0] == extent[2] ? vertex[0] : null
    const y = vertex[1] == extent[1] || vertex[1] == extent[3] ? vertex[1] : null

    if (x !== null && y !== null) {
      return pointHandler(oppositeVertex(extent, vertex))
    } else if (x !== null) {
      return edgeHandler(
        oppositeVertex(extent, [x, extent[1]]),
        oppositeVertex(extent, [x, extent[3]])
      )
    } else if (y !== null) {
      return edgeHandler(
        oppositeVertex(extent, [extent[0], y]),
        oppositeVertex(extent, [extent[2], y])
      )
    }
  } else {
    return pointHandler(coordinate)
  }
}

/**
 * 
 */
export const pointHandler = a => x => boundingExtent([a, x])

/**
 * 
 */
export const edgeHandler = (a, b) => {
  if (a[0] === b[0]) return x => boundingExtent([a, [x[0], b[1]]])
  else if (a[1] === b[1]) return x => boundingExtent([a, [b[0], x[1]]])
  else return () => null
}

/**
 * 
 */
export const segments = extent => 
    extent
      ? [
          [[extent[0], extent[1]], [extent[0], extent[3]]],
          [[extent[0], extent[3]], [extent[2], extent[3]]],
          [[extent[2], extent[3]], [extent[2], extent[1]]],
          [[extent[2], extent[1]], [extent[0], extent[1]]]
        ]
      : null

/**
 * 
 */
export const polygon = extent => extent ? polygonFromExtent(extent) : null

/**
 * 
 */
const compareDistance = coordinate => 
  (a, b) => 
    squaredDistanceToSegment(coordinate, a) -
    squaredDistanceToSegment(coordinate, b)

/**
 * 
 */
export const snap = (event, segments) => {
  if (!event || !segments) return null

  // Convert extents to line segments and 
  // find the segment closest to pixelCoordinate.
  const { coordinate, pixel } = event // FIXME: coordinate/pixel are redundant
  const closestSegment = R.sort(compareDistance(coordinate), segments)[0]  
  const vertex = closestOnSegment(coordinate, closestSegment)
  const vertexPixel = event.pixelFromCoordinateInternal(vertex)

  if (coordinateDistance(pixel, vertexPixel) > event.pixelTolerance) {
    return null
  }

  // If the distance is within tolerance, snap to the segment.
  const pixel1 = event.pixelFromCoordinateInternal(closestSegment[0])
  const pixel2 = event.pixelFromCoordinateInternal(closestSegment[1])
  const squaredDist1 = squaredCoordinateDistance(vertexPixel, pixel1)
  const squaredDist2 = squaredCoordinateDistance(vertexPixel, pixel2)
  const dist = Math.sqrt(Math.min(squaredDist1, squaredDist2))
  return dist <= event.pixelTolerance
    ? squaredDist1 > squaredDist2 
      ? closestSegment[1] 
      : closestSegment[0]
    : vertex
}

/**
 * 
 */
export const oppositeVertex = (extent, vertex) => {
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
}

export const Event = {
  of: options => event => ({
    type: event.type,
    pixel: event.pixel,
    coordinate: event.coordinate,
    pixelTolerance: options.pixelTolerance === undefined ? 10 : options.pixelTolerance,
    condition: options.condition || always,
    ...context(event.map)
  })
}
