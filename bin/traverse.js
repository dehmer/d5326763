const R = require('ramda')
const P = require('./predef')

const traverse = (ast, excludes = []) => {
  const scope = null
  const acc = []

  // state :: [Relation] -> Unit
  const state = (...relations) => {
    acc.push(...relations)
  }

  const customVisitor = { ...visitor }
  excludes.forEach(name => delete customVisitor[name])

  require('@babel/traverse').default(ast, customVisitor, scope, state)
  return acc
}



const visitor = {}

// visitor.Program = (path, state) => {
//   const { scope, node } = path
//   console.log('[Program]', Object.keys(path))
//   console.log('[Program/scope]', Object.keys(scope), scope)
//   state({
//     type: P.type(node),
//     filename: P.filename(node)
//   })
// }

visitor.ExportNamedDeclaration = ({ node }, state) => state({
  type: P.type(node),
  filename: P.filename(node),
  declaration: P.declaration(node)
})

visitor.ExportDefaultDeclaration = ({ node }, state) => state({
  type: P.type(node),
  filename: P.filename(node),
  declaration: P.declaration(node)
})

visitor.ExportAllDeclaration = ({ node }, state) => state({
  type: P.type(node),
  filename: P.filename(node),
  source: P.source(node)
})

visitor.ExportSpecifier = ({ node, parent }, state) => state({
  type: P.type(node),
  filename: P.filename(node),
  source: P.source(parent),
  exported: P.exported(node),
  local: P.local(node)
})

visitor.ExportNamespaceSpecifier = ({ node, parent }, state) => state({
  type: P.type(node),
  filename: P.filename(node),
  source: P.source(parent),
  exported: P.exported(node),
})

visitor.ImportDefaultSpecifier = ({ node, parent }, state) => state({
  type: P.type(node),
  filename: P.filename(node),
  source: P.source(parent),
  local: P.local(node)
})

visitor.ImportNamespaceSpecifier = ({ node, parent }, state) => state({
  type: P.type(node),
  filename: P.filename(node),
  source: P.source(parent),
  local: P.local(node)
})

visitor.ImportSpecifier = ({ node, parent }, state) => state({
  type: P.type(node),
  filename: P.filename(node),
  source: P.source(parent),
  imported: P.imported(node),
  local: P.local(node)
})

visitor.ClassDeclaration = ({ node }, state) => state({
  type: P.type(node),
  filename: P.filename(node),
  id: P.id(node),
  superClass: P.superClass(node)
})

visitor.ClassMethod = ({ node }, state) => state({
  type: P.type(node),
  filename: P.filename(node),
  key: P.key(node),
  kind: P.kind(node),
  static: P.static(node)
})

// visitor.AssignmentExpression = (path, state) => {
//   const { node } = path
//   console.log('[AssignmentExpression]', node)
// }

visitor.MemberExpression = (path, state) => {
  const { node, parent } = path
  console.log('[MemberExpression]', P.property(node), parent.type)
}

// visitor.BlockStatement = (path, state) => {
//   const { scope, node } = path
//   const bindings = Object.entries(scope.bindings)
//   const references = Object.entries(scope.references)
//   // console.log('[BlockStatement]', Object.keys(path))
//   // console.log('[BlockStatement/scope]', Object.keys(scope), scope)
//   console.log('[BlockStatement/path]', Object.keys(scope.path), scope.path)
//   // console.log('[BlockStatement/bindings]', scope.uid, bindings)
//   // console.log('[BlockStatement/references]', scope.uid, references)
// }

module.exports = traverse
