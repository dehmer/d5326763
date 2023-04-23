import {assert} from '../asserts.js';

export function getCorner(extent, corner) {
  let coordinate;
  if (corner === 'bottom-left') {
    coordinate = getBottomLeft(extent);
  } else if (corner === 'bottom-right') {
    coordinate = getBottomRight(extent);
  } else if (corner === 'top-left') {
    coordinate = getTopLeft(extent);
  } else if (corner === 'top-right') {
    coordinate = getTopRight(extent);
  } else {
    assert(false, 13); // Invalid corner
  }
  return coordinate;
}
