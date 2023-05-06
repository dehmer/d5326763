const R = require('ramda')

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

const typeEq = name => R.propEq(name, 'type')

// Node -> String
const type = R.prop('type')

// filename :: Node -> String
const filename = R.path(['loc', 'filename'])

// source :: ImportDeclaration => String
const source = R.path(['source', 'value'])

// local :: ImportNamespaceSpecifier -> String
// local :: ImportDefaultSpecifier -> String
// local :: ImportSpecifier -> String
const local = R.path(['local', 'name'])

// declaration :: ExportNamedDeclaration -> [String]
// declaration :: ExportDefaultDeclaration -> [String]
const declaration = x => R.cond([
  [R.has('declaration'), R.compose(declaration, R.prop('declaration'))],
  [R.has('declarations'), R.compose(R.chain(declaration), R.prop('declarations'))],
  [R.has('id'), R.compose(declaration, R.prop('id'))],
  [R.has('name'), R.compose(R.of(Array), R.prop('name'))],
  [R.T, R.always([])]
])(x)

// imported :: ImportSpecifier -> String
const imported = R.cond([
  [R.compose(typeEq('Identifier'), R.prop('imported')), R.path(['imported', 'name'])],
  [R.compose(typeEq('StringLiteral'), R.prop('imported')), R.path(['imported', 'value'])],
])

// exported :: ExportSpecifier -> String
// exported :: ExportNamespaceSpecifier -> String
const exported = R.cond([
  [R.compose(typeEq('Identifier'), R.prop('exported')), R.path(['exported', 'name'])],
  [R.compose(typeEq('StringLiteral'), R.prop('exported')), R.path(['exported', 'value'])]
])

// id :: ClassDeclaration -> String
const id = R.path(['id', 'name'])

// superClass :: ClassDeclaration -> String
const superClass = R.path(['superClass', 'name'])

// key :: ClassMethod -> String
const key = R.path(['key', 'name'])

// static :: ClassMethod -> Boolean
const static = R.prop('static')

// kind :: ClassMethod -> String
const kind = R.prop('kind')

const visitor = {}

visitor.Program = (path, state) => {
  const { scope, node } = path
  console.log('[Program]', Object.keys(path))
  console.log('[Program/scope]', Object.keys(scope), scope)
  state({
    type: type(node),
    filename: filename(node)
  })
}

visitor.ExportNamedDeclaration = ({ node }, state) => state({
  type: type(node),
  filename: filename(node),
  declaration: declaration(node)
})

visitor.ExportDefaultDeclaration = ({ node }, state) => state({
  type: type(node),
  filename: filename(node),
  declaration: declaration(node)
})

visitor.ExportAllDeclaration = ({ node }, state) => state({
  type: type(node),
  filename: filename(node),
  source: source(node)
})

visitor.ExportSpecifier = ({ node, parent }, state) => state({
  type: type(node),
  filename: filename(node),
  source: source(parent),
  exported: exported(node),
  local: local(node)
})

visitor.ExportNamespaceSpecifier = ({ node, parent }, state) => state({
  type: type(node),
  filename: filename(node),
  source: source(parent),
  exported: exported(node),
})

visitor.ImportDefaultSpecifier = ({ node, parent }, state) => state({
  type: type(node),
  filename: filename(node),
  source: source(parent),
  local: local(node)
})

visitor.ImportNamespaceSpecifier = ({ node, parent }, state) => state({
  type: type(node),
  filename: filename(node),
  source: source(parent),
  local: local(node)
})

visitor.ImportSpecifier = ({ node, parent }, state) => state({
  type: type(node),
  filename: filename(node),
  source: source(parent),
  imported: imported(node),
  local: local(node)
})

visitor.ClassDeclaration = ({ node }, state) => state({
  type: type(node),
  filename: filename(node),
  id: id(node),
  superClass: superClass(node)
})

visitor.ClassMethod = ({ node }, state) => state({
  type: type(node),
  filename: filename(node),
  key: key(node),
  kind: kind(node),
  static: static(node)
})

visitor.BlockStatement = (path, state) => {
  const { scope, node } = path
  const bindings = Object.entries(scope.bindings)
  const references = Object.entries(scope.references)
  // console.log('[BlockStatement]', Object.keys(path))
  // console.log('[BlockStatement/scope]', Object.keys(scope), scope)
  console.log('[BlockStatement/path]', Object.keys(scope.path), scope.path)
  // console.log('[BlockStatement/bindings]', scope.uid, bindings)
  // console.log('[BlockStatement/references]', scope.uid, references)
}

module.exports = traverse
