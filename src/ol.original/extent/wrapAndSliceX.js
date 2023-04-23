import {getWidth} from './getWidth'
import {wrapX} from './wrapX'

export function wrapAndSliceX(extent, projection) {
  if (projection.canWrapX()) {
    const projectionExtent = projection.getExtent();

    if (!isFinite(extent[0]) || !isFinite(extent[2])) {
      return [[projectionExtent[0], extent[1], projectionExtent[2], extent[3]]];
    }

    wrapX(extent, projection);
    const worldWidth = getWidth(projectionExtent);

    if (getWidth(extent) > worldWidth) {
      // the extent wraps around on itself
      return [[projectionExtent[0], extent[1], projectionExtent[2], extent[3]]];
    } else if (extent[0] < projectionExtent[0]) {
      // the extent crosses the anti meridian, so it needs to be sliced
      return [
        [extent[0] + worldWidth, extent[1], projectionExtent[2], extent[3]],
        [projectionExtent[0], extent[1], extent[2], extent[3]],
      ];
    } else if (extent[2] > projectionExtent[2]) {
      // the extent crosses the anti meridian, so it needs to be sliced
      return [
        [extent[0], extent[1], projectionExtent[2], extent[3]],
        [projectionExtent[0], extent[1], extent[2] - worldWidth, extent[3]],
      ];
    }
  }

  return [extent];
}
