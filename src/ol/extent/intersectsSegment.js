import Relationship from './Relationship.js';
import {coordinateRelationship} from './coordinateRelationship'

export function intersectsSegment(extent, start, end) {
  let intersects = false;
  const startRel = coordinateRelationship(extent, start);
  const endRel = coordinateRelationship(extent, end);
  if (
    startRel === Relationship.INTERSECTING ||
    endRel === Relationship.INTERSECTING
  ) {
    intersects = true;
  } else {
    const minX = extent[0];
    const minY = extent[1];
    const maxX = extent[2];
    const maxY = extent[3];
    const startX = start[0];
    const startY = start[1];
    const endX = end[0];
    const endY = end[1];
    const slope = (endY - startY) / (endX - startX);
    let x, y;
    if (!!(endRel & Relationship.ABOVE) && !(startRel & Relationship.ABOVE)) {
      // potentially intersects top
      x = endX - (endY - maxY) / slope;
      intersects = x >= minX && x <= maxX;
    }
    if (
      !intersects &&
      !!(endRel & Relationship.RIGHT) &&
      !(startRel & Relationship.RIGHT)
    ) {
      // potentially intersects right
      y = endY - (endX - maxX) * slope;
      intersects = y >= minY && y <= maxY;
    }
    if (
      !intersects &&
      !!(endRel & Relationship.BELOW) &&
      !(startRel & Relationship.BELOW)
    ) {
      // potentially intersects bottom
      x = endX - (endY - minY) / slope;
      intersects = x >= minX && x <= maxX;
    }
    if (
      !intersects &&
      !!(endRel & Relationship.LEFT) &&
      !(startRel & Relationship.LEFT)
    ) {
      // potentially intersects left
      y = endY - (endX - minX) * slope;
      intersects = y >= minY && y <= maxY;
    }
  }
  return intersects;
}
