const R = require('ramda')
const P = require('./predef')

const scopeId = path => {
  const uids = ({ scope }) => scope.path.parentPath
    ? [...uids(scope.path.parentPath), scope.uid]
    : [scope.uid]

  return `${P.filename(path.node)}:${uids(path).join('/')}`
}

const symbols = (ast, excludes = []) => {
  const acc = {}

  const scope = path => {
    const id = scopeId(path)
    console.log('scope/bindings', id, Object.keys(path.scope.bindings))
  }

  const customVisitor = { ...visitor }
  excludes.forEach(name => delete customVisitor[name])

  require('@babel/traverse').default(ast, customVisitor, null, scope)
  return acc
}


const visitor = {}

// visitor.Program = (path, scope) => {
//   scope(path)
// }

// visitor.ClassDeclaration = (path, scope) => {
//   scope(path)
// }


// visitor.ClassMethod = (path, scope) => {
//   scope(path)
// }

visitor.ThisExpression = (path, scope) => {
  const { node, parent } = path
  switch (parent.type) {
    case 'MemberExpression': return console.log('[ThisExpression]', parent.type, P.property(parent))
    default: return console.log('[ThisExpression]', parent.type, parent)
  }
}

module.exports = symbols
