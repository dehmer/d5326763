import {getCenter} from './getCenter'
import {getWidth} from './getWidth'

export function wrapX(extent, projection) {
  const projectionExtent = projection.getExtent();
  const center = getCenter(extent);
  if (
    projection.canWrapX() &&
    (center[0] < projectionExtent[0] || center[0] >= projectionExtent[2])
  ) {
    const worldWidth = getWidth(projectionExtent);
    const worldsAway = Math.floor(
      (center[0] - projectionExtent[0]) / worldWidth
    );
    const offset = worldsAway * worldWidth;
    extent[0] -= offset;
    extent[2] -= offset;
  }
  return extent;
}
