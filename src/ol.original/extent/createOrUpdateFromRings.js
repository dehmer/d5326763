import {createOrUpdateEmpty} from './createOrUpdateEmpty'
import {extendRings} from './extendRings'

export function createOrUpdateFromRings(rings, dest) {
  const extent = createOrUpdateEmpty(dest);
  return extendRings(extent, rings);
}
