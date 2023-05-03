const depth = x => 
  (Array.isArray(x) && x.length) 
    ? 1 + depth(x[0])
    : 0

const makeRelations = () => {
  const actual = []
  const relations = relations => {  
    depth(relations) === 1
      ? actual.push(relations)
      : actual.push(...relations)
  } 

  return {
    relations,
    actual: () => actual
  }
}

module.exports = makeRelations
