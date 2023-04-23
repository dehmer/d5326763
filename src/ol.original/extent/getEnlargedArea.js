export function getEnlargedArea(extent1, extent2) {
  const minX = Math.min(extent1[0], extent2[0]);
  const minY = Math.min(extent1[1], extent2[1]);
  const maxX = Math.max(extent1[2], extent2[2]);
  const maxY = Math.max(extent1[3], extent2[3]);
  return (maxX - minX) * (maxY - minY);
}
