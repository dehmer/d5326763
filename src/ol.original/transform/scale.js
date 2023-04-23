import {set} from './set'
import {multiply} from './multiply'

export function scale(transform, x, y) {
  const tmp_ = new Array(6);
  return multiply(transform, set(tmp_, x, 0, 0, y, 0, 0));
}
