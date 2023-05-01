const removeNoise = ({ 
  comments, 
  leadingComments, 
  trailingComments, 
  start, 
  end, 
  loc, 
  source, 
  ...rest
}) => rest

const sanitize = R.compose(
  R.tap(x => console.log('split', x)),
  split,
  R.tap(x => console.log('removeNoise', x)),
  removeNoise
)

const tuple = ast => {
  const flattenChildren = R.compose(
    R.map(tuple),
    R.filter(Boolean),
    R.flatten
  )
  
  const [node, ...children] = sanitize(ast)
  return [node, ...flattenChildren(children)]
}

module.exports = tuple