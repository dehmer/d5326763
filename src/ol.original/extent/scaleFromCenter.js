export function scaleFromCenter(extent, value) {
  const deltaX = ((extent[2] - extent[0]) / 2) * (value - 1);
  const deltaY = ((extent[3] - extent[1]) / 2) * (value - 1);
  extent[0] -= deltaX;
  extent[2] += deltaX;
  extent[1] -= deltaY;
  extent[3] += deltaY;
}
