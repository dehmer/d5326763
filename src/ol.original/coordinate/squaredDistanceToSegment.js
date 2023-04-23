import {squaredDistance} from './squaredDistance'
import {closestOnSegment} from './closestOnSegment'

export function squaredDistanceToSegment(coordinate, segment) {
  return squaredDistance(coordinate, closestOnSegment(coordinate, segment));
}
