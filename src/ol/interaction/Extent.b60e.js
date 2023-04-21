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
  const $extent = flyd.stream(null)
  const $moveCoordinate = flyd.map(coordinate, $pointermove)
  const $dragCoordinate = flyd.map(coordinate, $pointerdrag)
  const $coordinate = flyd.merge($moveCoordinate, $dragCoordinate)
  const $point = flyd.map(point, $coordinate)
  const $segments = flyd.map(segments, $extent)
  const $polygon = flyd.map(polygon, $extent)
  const $snap = flyd.map(snap2, $segments)
  const $snapped = flyd.ap($pointermove, $snap)

  dispatch(event => ({
    pointermove: $pointermove,
    pointerdrag: $pointerdrag,
    pointerdown: $pointerdown,
    pointerup: $pointerup
  }[event?.type]), $event)

  const $handler = flyd.combine(($down, $up, self, changed) => {
    return changed.includes($down)
      ? dragHandler({
          extent: $extent(),
          vertex: $snapped(),
          coordinate: $coordinate()
        })
      : null
  }, [$pointerdown, $pointerup])

  flyd.on(console.log, $handler)
  flyd.on(vertexOverlay.update, $point)

  return $input
}
