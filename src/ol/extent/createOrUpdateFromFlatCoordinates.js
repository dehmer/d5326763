import {createOrUpdateEmpty} from './createOrUpdateEmpty'
import {extendFlatCoordinates} from './extendFlatCoordinates'

export function createOrUpdateFromFlatCoordinates(
  flatCoordinates,
  offset,
  end,
  stride,
  dest
) {
  const extent = createOrUpdateEmpty(dest);
  return extendFlatCoordinates(extent, flatCoordinates, offset, end, stride);
}
