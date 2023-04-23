import {set} from './set'

export function makeScale(target, x, y) {
  return set(target, x, 0, 0, y, 0, 0);
}
