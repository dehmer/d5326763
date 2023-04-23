export function approximatelyEquals(extent1, extent2, tolerance) {
  return (
    Math.abs(extent1[0] - extent2[0]) < tolerance &&
    Math.abs(extent1[2] - extent2[2]) < tolerance &&
    Math.abs(extent1[1] - extent2[1]) < tolerance &&
    Math.abs(extent1[3] - extent2[3]) < tolerance
  );
}
