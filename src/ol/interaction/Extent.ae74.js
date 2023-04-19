import * as R from 'ramda'
import * as F1 from 'flyd'
import { always } from '../events/condition.js'
import { extentOverlay, vertexOverlay } from './Extent.fns.js'
import { dispatch } from './flyd.js'
import { segments, polygon, dragHandler, snap } from './Extent.fns.js'
import { Event } from './Extent.fns.js'
import * as F2 from './flyd.js'

const flyd = Object.assign(F1, F2)

const Overlay = {
  extent: extentOverlay,
  vertex: vertexOverlay
}

export default (options = {}) => map => {
  options = {
    pixelTolerance: options.pixelTolerance === undefined ? 10 : options.pixelTolerance,
    condition: options.condition || always  
  }

  const extentOverlay = Overlay.extent(map, options)
  const vertexOverlay = Overlay.vertex(map, options)

  const dragmove = event => event.type === 'pointermove' && event.dragging
  const $input = flyd.stream()
  const $event = R.compose(
    flyd.map(Event.of(options)),
    flyd.filter(R.compose(R.not, dragmove))
  )($input)

  const $pointermove = flyd.stream()
  const $pointerdrag = flyd.stream() // OL still dispatches pointermove :-O
  const $pointerdown = flyd.stream()
  const $pointerup = flyd.stream()
  const $completedExtent = flyd.stream(null) // when drawn

  dispatch(event => ({
    pointermove: $pointermove,
    pointerdrag: $pointerdrag,
    pointerdown: $pointerdown,
    pointerup: $pointerup
  }[event?.type]), $event)

  const $moveCoordinate = $pointermove.map(R.prop('coordinate'))
  const $dragCoordinate = $pointerdrag.map(R.prop('coordinate'))
  const $segments = $completedExtent.map(segments)

  const $snappedCoordinate = flyd.combine(($event, $segments) => {
    return snap($event(), $segments())
  }, [$pointermove, $segments])

  const $handler = flyd.combine(($extent, $vertex, $event) => {
    return dragHandler({
      extent: $extent(),
      vertex: $vertex(),
      coordinate: $event().coordinate
    })
  }, [$completedExtent, $snappedCoordinate, $pointerdown])

  // ap :: s[v] -> s[fn] -> s[fn(v)]
  const $interimExtent = flyd.ap($dragCoordinate, $handler) 

  // FIXME: nasty side-effect
  flyd.on(() => {
    $completedExtent($interimExtent())
  }, $pointerup)

  const $extent = flyd.merge($interimExtent, $completedExtent)
  const $polygon = $extent.map(polygon)

  // Merge move/drag coordinate with optional snapped coordinate.
  // Snapped coordinate if defined has precedence.
  const $coordinate = flyd.combine(($coordinate, $snappedCoordinate) => {
    return $snappedCoordinate() || $coordinate()
  }, [flyd.merge($moveCoordinate, $dragCoordinate), $snappedCoordinate])

  flyd.on(vertexOverlay.update, $coordinate)
  flyd.on(extentOverlay.update, $polygon)

  return $input
}
