export default initial => {
  let current = initial

  return event => {
    if (event?.type && current[event.type]) {
      const result = current[event.type](event)
      if (result.length === 2) current = result[1]
      return result[0]
    } else return event
  }
}
