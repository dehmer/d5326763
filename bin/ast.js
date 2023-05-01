#!/usr/bin/env node
const fs = require('fs')
const R = require('ramda')
const { globSync: glob } = require('glob')
const parser = require('@babel/parser')

const filenames = glob('src/ol/**/*.js')
const readFile = filename => ({ filename, source: fs.readFileSync(filename, 'utf8')})
const parseCode = code => parser.parse(code, { sourceType: 'module' })
const script = file => ({ ...file, ast: parseCode(file.source) })

const visitor = {}

// visitor.ImportDeclaration = {
//   enter: (path, state) => {
//     const source = path.node.source.value
//     console.log('[ImportDeclaration]', source, path.node)
//   }
// }


// exported :: ExportSpecifier
const exported = R.path(['exported', 'name'])

// declaration :: ExportDefaultDeclaration -> String
const declaration = R.path(['declaration', 'name'])

// id = ClassDeclaration -> String
const id = R.path(['id', 'name'])

// superClass :: ClassDeclaration -> String
const superClass = R.path(['superClass', 'name'])

visitor.ImportSpecifier = {
  enter: (path, state) => {
    const { parent, node } = path
    state.relation(['ImportSpecifier', local(node), imported(node), source(parent)])
  }
}

visitor.ImportDefaultSpecifier = {
  enter: (path, state) => {
    const { parent, node } = path
    state.relation(['ImportDefaultSpecifier', local(node), source(parent)])
  }
}

visitor.ImportNamespaceSpecifier = {
  enter: (path, state) => {
    const { parent, node } = path
    state.relation(['ImportNamespaceSpecifier', local(node), source(parent)])
  }
}

visitor.ExportNamedDeclaration = {
  enter: (path, state) => {
    const { node } = path
    const { declaration, specifiers, source } = node
    console.log('ExportNamedDeclaration/declaration', declaration)
    console.log('ExportNamedDeclaration/specifiers', specifiers)
    console.log('ExportNamedDeclaration/source', source)
    // process.exit()
  }
}

// visitor.ExportDefaultDeclaration = {
//   enter: (path, state) => {
//     const { node } = path
//     console.log('ExportDefaultDeclaration', node)
//     process.exit()
//   }
// }

visitor.ClassDeclaration = {
  enter: (path, state) => {
    const { node } = path
    state.relation(['ClassDeclaration', id(node), superClass(node)])
  }
}

// visitor.ClassMethod = {
//   enter: (path, state) => {
//     console.log('[ClassMethod/state]', state)
//     const methodName = path.node?.key.name
//     console.log(methodName, '[ClassMethod]')
//   }
// }

// visitor.MemberExpression = {
//   enter: path => {
//     console.log(path.node.property.name, '[MemberExpression]')
//   }
// }

// visitor.Identifier = {
//   enter: path => {
//     console.log('  [Identifier/enter] ', path.node.name, path.scope.block.type)
//   }
// }

const traverse = ({ filename, ast }) => {
  const scope = null
  const state = moduleState(filename)
  require('@babel/traverse').default(ast, visitor, scope, state)
  return state
}

const moduleState = filename => {
  const relations = []
  const relation = x => relations.push(x)
  return {
    filename,
    relations,
    relation,
  }
}

const trace = tag => R.map(x => console.log(tag, x))

const modules = R.compose(
  // R.reduce((acc, { name, tuple }) => R.tap(acc => (acc[name] = tuple))(acc), {}),  
  // R.map(({ name, ast }) => ({ name, tuple: tuple(ast) })),
  // R.tap(x => console.log('state', x)),
  trace('state'),
  R.map(traverse),
  // R.tap(x => console.log(x)),
  R.map(script),
  R.map(readFile),
  // R.filter(filename => filename === 'src/ol/Map.js')
  // R.filter(filename => filename === 'src/ol/xml.js')
  // R.filter(filename => filename === 'src/ol/style.js')
)

modules(filenames)
// console.log(JSON.stringify(modules(filenames), null, 2))
