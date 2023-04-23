import {extendCoordinate} from './extendCoordinate'

export function extendCoordinates(extent, coordinates) {
  for (let i = 0, ii = coordinates.length; i < ii; ++i) {
    extendCoordinate(extent, coordinates[i]);
  }
  return extent;
}
