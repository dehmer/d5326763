import {extendCoordinates} from './extendCoordinates'

export function extendRings(extent, rings) {
  for (let i = 0, ii = rings.length; i < ii; ++i) {
    extendCoordinates(extent, rings[i]);
  }
  return extent;
}
