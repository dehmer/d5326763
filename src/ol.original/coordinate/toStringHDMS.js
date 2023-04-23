import {degreesToStringHDMS} from './degreesToStringHDMS'

export function toStringHDMS(coordinate, fractionDigits) {
  if (coordinate) {
    return (
      degreesToStringHDMS('NS', coordinate[1], fractionDigits) +
      ' ' +
      degreesToStringHDMS('EW', coordinate[0], fractionDigits)
    );
  }
  return '';
}
