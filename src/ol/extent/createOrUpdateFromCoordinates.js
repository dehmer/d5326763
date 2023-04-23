import {createOrUpdateEmpty} from './createOrUpdateEmpty'
import {extendCoordinates} from './extendCoordinates'

export function createOrUpdateFromCoordinates(coordinates, dest) {
  const extent = createOrUpdateEmpty(dest);
  return extendCoordinates(extent, coordinates);
}
