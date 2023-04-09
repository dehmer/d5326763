// Only update value of combined stream if single dependency value changed.
export const lazy = fn => {
  let last // last known value
  return s => {
    if (last === s()) return undefined // don't update combined stream
    last = s() // cache and ...
    return fn(s) // get next value
  }
}
