const R = require('ramda')

const traverse = R.curry((relations, ast) => {
  const scope = null
  require('@babel/traverse').default(ast, visitor, scope, relations)
  return relations
})

const typeEq = name => R.propEq(name, 'type')

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

const declarations = node => R.compose(
  R.map(name => [node.type, name]),
  declaration
)(node)


const visitor = {}

// ExportDeclaration
visitor.ExportNamedDeclaration = ({ node }, state) => state(declarations(node))
visitor.ExportDefaultDeclaration = ({ node }, state) => state(declarations(node))  
visitor.ExportAllDeclaration = ({ node }, state) => state([node.type, source(node)])
visitor.ExportSpecifier = ({ node, parent }, state) => state([node.type, source(parent), exported(node), local(node)])
visitor.ExportNamespaceSpecifier = ({ node, parent }, state) => state([node.type, source(parent), exported(node)])

// ImportDeclaration
visitor.ImportDefaultSpecifier = ({ node, parent }, state) => state([node.type, source(parent), local(node)])
visitor.ImportNamespaceSpecifier = ({ node, parent }, state) => state([node.type, source(parent), local(node)])
visitor.ImportSpecifier = ({ node, parent }, state) => state([node.type, source(parent), imported(node), local(node)])

module.exports = traverse
