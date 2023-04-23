import {WORKER_OFFSCREEN_CANVAS} from '../has.js';

let transformStringDiv;

export function toString(mat) {
  const transformString = 'matrix(' + mat.join(', ') + ')';
  if (WORKER_OFFSCREEN_CANVAS) {
    return transformString;
  }
  const node =
    transformStringDiv || (transformStringDiv = document.createElement('div'));
  node.style.transform = transformString;
  return node.style.transform;
}
