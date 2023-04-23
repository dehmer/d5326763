import {set} from './set'

export function reset(transform) {
  return set(transform, 1, 0, 0, 1, 0, 0);
}
