export function getIntersectionArea(extent1, extent2) {
  const intersection = getIntersection(extent1, extent2);
  return getArea(intersection);
}
