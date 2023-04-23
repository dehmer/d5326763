import {set} from './set'
import {multiply} from './multiply'

export function rotate(transform, angle) {
  const tmp_ = new Array(6);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return multiply(transform, set(tmp_, cos, sin, -sin, cos, 0, 0));
}
