import * as R from 'ramda'
import * as flyd from 'flyd'

// Only update value of combined stream if single dependency value changed.
export const skipRepeats = (s, eq = (a, b) => a === b) => {
  let previous // last known value
  return flyd.combine((s, self) => {
    if (!self.hasVal || !eq(s.val, previous)) {
      self(s.val)
      previous = s.val
    }
  }, [s])
}

/**
 * 
 */
export const forward = flyd.curryN(2, function(args, fn) {
  var s = flyd.stream()
  flyd.map(function(v) { 
    args(fn(v))
  }, s)
  return s
})

/**
 * 
 */
export const dispatch = R.curry((fn, source) => {
  return flyd.combine(s => {
    const target = fn(s.val)
    if (target) target(s.val)
  }, [source])
})
  
/**
 * 
 */
export const filter = flyd.curryN(2, function(fn, s) {
  return flyd.combine(function(s, self) {
    if (fn(s())) self(s.val)
  }, [s])
})

/**
 * 
 */
export const loop = R.curry((fn, initial, $s) => {
  let acc = initial
  return flyd.combine($s => {
    const [next, val] = fn(acc, $s.val)
    acc = next
    return val
  }, [$s])
})
