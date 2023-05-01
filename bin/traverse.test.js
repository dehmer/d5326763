const assert = require('assert')
const parser = require('@babel/parser')
const traverse = require('./traverse')

const parse = script => parser.parse(script, { sourceType: 'module' })

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

describe('ImportDeclaration', function () {
  require('./traverse.test.import.js').forEach(({ source, expected }) => {
    it(source, function () {
      const ast = parse(source)
      const { relations, actual } = makeRelations()
      traverse(relations, ast)
      assert.deepStrictEqual(actual(), expected)
    })
  })
})

describe('ExportDeclaration', function() {
  require('./traverse.test.export.js').forEach(({ source, expected }) => {
    it(source, function () {
      const { relations, actual } = makeRelations()
      const ast = parse(source)
      traverse(relations, ast)
      assert.deepStrictEqual(actual(), expected)
    })
  })
})
