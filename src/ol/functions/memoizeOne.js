import {equals as arrayEquals} from '../array/equals.js';

export function memoizeOne(fn) {
  let called = false;

  /** @type {ReturnType} */
  let lastResult;

  /** @type {Array<any>} */
  let lastArgs;

  let lastThis;

  return function () {
    const nextArgs = Array.prototype.slice.call(arguments);
    if (!called || this !== lastThis || !arrayEquals(nextArgs, lastArgs)) {
      called = true;
      lastThis = this;
      lastArgs = nextArgs;
      lastResult = fn.apply(this, arguments);
    }
    return lastResult;
  };
}
