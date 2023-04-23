import {assert} from '../asserts.js'
import {determinant} from './determinant'

export function makeInverse(target, source) {
  const det = determinant(source);
  assert(det !== 0, 32); // Transformation matrix cannot be inverted

  const a = source[0];
  const b = source[1];
  const c = source[2];
  const d = source[3];
  const e = source[4];
  const f = source[5];

  target[0] = d / det;
  target[1] = -b / det;
  target[2] = -c / det;
  target[3] = a / det;
  target[4] = (c * f - d * e) / det;
  target[5] = -(a * f - b * e) / det;

  return target;
}
