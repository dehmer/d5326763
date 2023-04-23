import {makeInverse} from './makeInverse'

export function invert(source) {
  return makeInverse(source, source);
}
