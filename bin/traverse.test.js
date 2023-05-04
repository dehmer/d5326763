const assert = require('assert')
const parser = require('@babel/parser')
const R = require('ramda')

const parse = script => parser.parse(script, { sourceType: 'module' })

const traverse = ast => {
  const excludes = ['Program']
  const relations = require('./traverse')(ast, excludes)
  return R.map(R.reject(R.isNil), relations)
}

describe('ImportDeclaration', function () {
  require('./traverse.test.import.js').forEach(({ source, expected }) => {
    it(source, function () {
      const ast = parse(source)
      const actual = traverse(ast)
      assert.deepStrictEqual(actual, expected)
    })
  })
})

describe.only('ExportDeclaration', function() {
  require('./traverse.test.export.js').forEach(({ source, expected }) => {
    it(source, function () {
      const ast = parse(source)
      const actual = traverse(ast)
      assert.deepStrictEqual(actual, expected)
    })
  })
})
