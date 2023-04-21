import * as R from 'ramda'
import * as F1 from 'flyd'
import { always } from '../events/condition.js'
import { extentOverlay, vertexOverlay } from './Extent.fns.js'
import { dispatch } from './flyd.js'
import { segments, polygon, area, dragHandler, snap } from './Extent.fns.js'
import { Event } from './Extent.fns.js'
import * as F2 from './flyd.js'

const flyd = Object.assign(F1, F2)

const Overlay = {
  extent: extentOverlay,
  vertex: vertexOverlay
}

const dragmove = event => event.type === 'pointermove' && event.dragging
const coordinate = R.ifElse(R.isNil, R.always(null), R.prop('coordinate'))

export default (options = {}) => map => {
  options = {
    pixelTolerance: options.pixelTolerance === undefined ? 10 : options.pixelTolerance,
    condition: options.condition || always  
  }

  const extentOverlay = Overlay.extent(map, options)
  const vertexOverlay = Overlay.vertex(map, options)

  const $input = flyd.stream()
  const $event = R.compose(
    flyd.map(Event.of(map, options)),
    flyd.filter(R.compose(R.not, dragmove))
  )($input)

  const $pointermove = flyd.stream()
  const $pointerdrag = flyd.stream()
  const $pointerdown = flyd.stream(null)
  const $pointerup = flyd.stream(null)
  const $moveCoordinate = flyd.map(coordinate, $pointermove)
  const $dragCoordinate = flyd.map(coordinate, $pointerdrag)
  const $coordinate = flyd.merge($moveCoordinate, $dragCoordinate)

  dispatch(event => ({
    pointermove: $pointermove,
    pointerdrag: $pointerdrag,
    pointerdown: $pointerdown,
    pointerup: $pointerup
  }[event?.type]), $event)

  const $dragging = flyd.combine(($down, $up, self, changed) => {
    if (self() === undefined) return false
    else return changed.length && changed[0] === $down
  }, [$pointerdown, $pointerup])

  flyd.on(vertexOverlay.update, $coordinate)

  return $input

  // const $completedExtent = flyd.stream()
  // const $segments = $completedExtent.map(segments)
  // const $moveCoordinate = $pointermove.map(coordinate)
  // const $dragCoordinate = $pointerdrag.map(coordinate)


  // const $snappedCoordinate = flyd.combine(($event, $segments, $dragging) => {
  //   if ($dragging()) return null
  //   return snap($event(), $segments())
  // }, [$pointermove, $segments, $dragging])

  // flyd.on(x => console.log(x), $snappedCoordinate)

  // // Merge move/drag coordinate with optional snapped coordinate.
  // // Snapped coordinate if defined has precedence.
  // const $coordinate = flyd.combine(($coordinate, $snapped) => {
  //   // console.log('dragging', $dragging())
  //   return $snapped() || $coordinate()
  // }, [flyd.merge($moveCoordinate, $dragCoordinate), $snappedCoordinate])


  // const $handler = flyd.combine(($extent, $vertex, $dragging, $coordinate) => {
  //   if (!$dragging()) return undefined

  //   return dragHandler({
  //     extent: $extent(),
  //     vertex: $vertex(),
  //     coordinate: $coordinate()
  //   })
  // }, [$completedExtent, $snappedCoordinate, $dragging, $moveCoordinate])

  // // ap :: s[v] -> s[fn] -> s[fn(v)]
  // const $interimExtent = flyd.ap($dragCoordinate, $handler) 
  // const $area = R.compose(
  //   flyd.map(area),
  //   flyd.map(polygon)
  // )($interimExtent)

  // // FIXME: nasty side-effect
  // flyd.on(() => {
  //   console.log('interimExtent', $interimExtent())
  //   $completedExtent($interimExtent())
  // }, $pointerup)

  // const $extent = flyd.merge($interimExtent, $completedExtent)
  // const $polygon = flyd.map(polygon, $extent)


  // flyd.on(extentOverlay.update, $polygon)

}
