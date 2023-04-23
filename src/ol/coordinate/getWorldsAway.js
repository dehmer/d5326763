import {getWidth} from '../extent/getWidth.js';

export function getWorldsAway(coordinate, projection, sourceExtentWidth) {
  const projectionExtent = projection.getExtent();
  let worldsAway = 0;
  if (
    projection.canWrapX() &&
    (coordinate[0] < projectionExtent[0] || coordinate[0] > projectionExtent[2])
  ) {
    sourceExtentWidth = sourceExtentWidth || getWidth(projectionExtent);
    worldsAway = Math.floor(
      (coordinate[0] - projectionExtent[0]) / sourceExtentWidth
    );
  }
  return worldsAway;
}
