export function closestOnCircle(coordinate, circle) {
  const r = circle.getRadius();
  const center = circle.getCenter();
  const x0 = center[0];
  const y0 = center[1];
  const x1 = coordinate[0];
  const y1 = coordinate[1];

  let dx = x1 - x0;
  const dy = y1 - y0;
  if (dx === 0 && dy === 0) {
    dx = 1;
  }
  const d = Math.sqrt(dx * dx + dy * dy);

  const x = x0 + (r * dx) / d;
  const y = y0 + (r * dy) / d;

  return [x, y];
}
