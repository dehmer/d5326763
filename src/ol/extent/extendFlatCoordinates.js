import {extendXY} from './extendXY'

export function extendFlatCoordinates(
  extent,
  flatCoordinates,
  offset,
  end,
  stride
) {
  for (; offset < end; offset += stride) {
    extendXY(extent, flatCoordinates[offset], flatCoordinates[offset + 1]);
  }
  return extent;
}
