import {format} from './format'

export function toStringXY(coordinate, fractionDigits) {
  return format(coordinate, '{x}, {y}', fractionDigits);
}
