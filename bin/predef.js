const R = require('ramda')

// Node -> String
const type = R.prop('type')

// key :: ClassMethod -> String
const key = R.path(['key', 'name'])

// filename :: Node -> String
const filename = R.path(['loc', 'filename'])

// property :: MemberExpression -> String
const property = R.path(['property', 'name'])

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

// id :: ClassDeclaration -> String
const id = R.path(['id', 'name'])

// superClass :: ClassDeclaration -> String
const superClass = R.path(['superClass', 'name'])


// static :: ClassMethod -> Boolean
const static = R.prop('static')

// kind :: ClassMethod -> String
const kind = R.prop('kind')

module.exports = {
  fromEntries: Object.fromEntries,
  trace: tag => R.tap(x => console.log(tag, x)),
  type,
  key,
  filename,
  property,
  source,
  local,
  declaration,
  imported,
  exported,
  id,
  superClass,
  static,
  kind
}