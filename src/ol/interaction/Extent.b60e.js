import * as R from 'ramda'
import * as F1 from 'flyd'
import { always } from '../events/condition.js'
import { extentOverlay, vertexOverlay } from './Extent.fns.js'
import { dispatch } from './flyd.js'
import { segments, point, polygon, area, dragHandler, snap, snap2 } from './Extent.fns.js'
import { Event } from './Extent.fns.js'
import * as F2 from './flyd.js'

const flyd = Object.assign(F1, F2)

const Overlay = {
  extent: extentOverlay,
  vertex: vertexOverlay
}

const coordinate = R.ifElse(R.isNil, R.always(null), R.prop('coordinate'))

export default (options = {}) => map => {
  options = {
    pixelTolerance: options.pixelTolerance === undefined ? 10 : options.pixelTolerance,
    condition: options.condition || always  
  }

  const extentOverlay = Overlay.extent(map, options)
  const vertexOverlay = Overlay.vertex(map, options)

  const $input = flyd.stream()

  // What you see ain't what you get.
  // 1. OL emits move AND drag events while dragging
  // 2. drag events are only emitted after mouse moved a certain distance
  const $event = R.compose(
    flyd.map(Event.of(map, options)),
    flyd.filter(x => x.type !== 'pointerdrag')
  )($input)

  const $pointermove = flyd.stream()
  const $pointerdown = flyd.stream()
  const $pointerup = flyd.stream()
  const $extent = flyd.stream(null)
  const $coordinate = flyd.map(coordinate, $pointermove)
  const $segments = flyd.map(segments, $extent)
  const $snap = flyd.map(snap2, $segments)
  const $snapped = flyd.ap($pointermove, $snap)

  dispatch(event => ({
    pointermove: $pointermove,
    pointerdown: $pointerdown,
    pointerup: $pointerup
  }[event?.type]), $event)

  const $dragging = R.compose(
    flyd.immediate
  )(flyd.combine(($down, $up, self, changed) => {
    return changed.includes($down)
  }, [$pointerdown, $pointerup]))
  
  const $handler = flyd.map(dragging => 
    dragging
      ? dragHandler({ extent: $extent(), vertex: $snapped(), coordinate: $coordinate() })
      : R.always(null)
    , $dragging)

  const $sketch = flyd.combine(($dragging, $handler, $coordinate) => {
    return $dragging() 
      ? $handler()($coordinate())
      : undefined
  }, [$dragging, $handler, $coordinate])

  const $polygon = flyd.map(polygon, $sketch)

  const $point = flyd.combine(($dragging, $coordinate, $snapped) => {
    const coordinate = $dragging()
      ? $coordinate()
      : $snapped() || $coordinate()
    return point(coordinate)
  }, [$dragging, $coordinate, $snapped])

  flyd.on(() => {
    const sketch = $sketch()
    $extent(area(polygon(sketch)) ? sketch : null)
  }, $pointerup)

  flyd.on(vertexOverlay.update, $point)
  flyd.on(extentOverlay.update, $polygon)

  return $input
}
