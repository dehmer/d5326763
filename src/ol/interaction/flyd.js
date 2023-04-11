// Only update value of combined stream if single dependency value changed.
export const skipRepeats = () => {
  let last // last known value
  return s => {
    if (last === s()) return undefined // don't update combined stream
    last = s()
    return last
  }
}

export const nullable = fn => s =>
  s() === null 
    ? null 
    : fn(s)
