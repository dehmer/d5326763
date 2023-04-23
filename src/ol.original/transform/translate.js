import {set} from './set'
import {multiply} from './multiply'

export function translate(transform, dx, dy) {
  const tmp_ = new Array(6);
  return multiply(transform, set(tmp_, 1, 0, 0, 1, dx, dy));
}
