export function format(coordinate, template, fractionDigits) {
  if (coordinate) {
    return template
      .replace('{x}', coordinate[0].toFixed(fractionDigits))
      .replace('{y}', coordinate[1].toFixed(fractionDigits));
  }
  return '';
}
