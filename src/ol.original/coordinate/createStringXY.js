import {toStringXY} from './toStringXY'

export function createStringXY(fractionDigits) {
  return (
    /**
     * @param {Coordinate} coordinate Coordinate.
     * @return {string} String XY.
     */
    function (coordinate) {
      return toStringXY(coordinate, fractionDigits);
    }
  );
}
