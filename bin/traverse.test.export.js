/**
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export
 */

module.exports = [

  // Exporting declarations

  {
    source: 'export let name1, name2/*, … */; // also var',
    expected: [
      {
        type: 'ExportNamedDeclaration',
        declaration: [ 'name1', 'name2' ]
      }
    ]

  },
  {
    source: 'export const name1 = 1, name2 = 2/*, … */; // also var, let',
    expected: [
      {
        type: 'ExportNamedDeclaration',
        declaration: [ 'name1', 'name2' ]
      }
    ]
  },
  {
    source: 'export function functionName() { /* … */ }',
    expected: [
      {
        type: 'ExportNamedDeclaration',
        declaration: [ 'functionName' ]
      }
    ]
  },
  {
    source: 'export class ClassName { /* … */ }',
    expected: [
      { type: 'ExportNamedDeclaration', declaration: [ 'ClassName' ] },
      { type: 'ClassDeclaration', id: 'ClassName' }
    ]
  },
  {
    source: 'export function* generatorFunctionName() { /* … */ }',
    expected: [
      {
        type: 'ExportNamedDeclaration',
        declaration: [ 'generatorFunctionName' ]
      }
    ]
  },
  {
    source: 'export const { name1, name2: bar } = o;',
    expected: [
      {
        type: 'ExportNamedDeclaration',
        declaration: []
      }
    ]
  },
  {
    source: 'export const [ name1, name2 ] = array;',
    expected: [
      {
        type: 'ExportNamedDeclaration',
        declaration: []
      }
    ]
  },

  // Export list

  {
    source: 'let name1, nameN; export { name1, /* …, */ nameN };',
    expected: [
      { type: 'ExportNamedDeclaration', declaration: [] },
      { type: 'ExportSpecifier', exported: 'name1', local: 'name1' },
      { type: 'ExportSpecifier', exported: 'nameN', local: 'nameN' }
    ]
  },
  {
    source: 'let variable1, variable2, nameN; export { variable1 as name1, variable2 as name2, /* …, */ nameN };',
    expected: [
      { type: 'ExportNamedDeclaration', declaration: [] },
      { type: 'ExportSpecifier', exported: 'name1', local: 'variable1' },
      { type: 'ExportSpecifier', exported: 'name2', local: 'variable2' },
      { type: 'ExportSpecifier', exported: 'nameN', local: 'nameN' }
    ]
  },
  {
    source: 'let variable1; export { variable1 as "string name" };',
    expected: [
      {
        type: 'ExportNamedDeclaration',
        declaration: []
      },
      {
        type: 'ExportSpecifier',
        exported: 'string name',
        local: 'variable1'
      }
    ]
  },
  {
    source: 'let name1; export { name1 as default /*, … */ };',
    expected: [
      { type: 'ExportNamedDeclaration', declaration: [] },
      { type: 'ExportSpecifier', exported: 'default', local: 'name1' }
    ]
  },

  // Default exports

  {
    source: 'export default expression;',
    expected: [
      { type: 'ExportDefaultDeclaration', declaration: [ 'expression' ] }
    ]
  },
  {
    source: 'export default function functionName() { /* … */ }',
    expected: [
      { type: 'ExportDefaultDeclaration', declaration: [ 'functionName' ] }
    ]
  },
  {
    source: 'export default class ClassName { /* … */ }',
    expected:  [
      { type: 'ExportDefaultDeclaration', declaration: [ 'ClassName' ] },
      { type: 'ClassDeclaration', id: 'ClassName' }
    ]
  },
  {
    source: 'export default function* generatorFunctionName() { /* … */ }',
    expected: [
      {
        type: 'ExportDefaultDeclaration',
        declaration: [ 'generatorFunctionName' ]
      }
    ]
  },
  {
    source: 'export default function () { /* … */ }',
    expected: [
      { type: 'ExportDefaultDeclaration', declaration: [] }
    ]
  },
  {
    source: 'export default class { /* … */ }',
    expected: [
      { type: 'ExportDefaultDeclaration', declaration: [] },
      { type: 'ClassDeclaration' }
    ]
  },
  {
    source: 'export default function* () { /* … */ }',
    expected: [
      { type: 'ExportDefaultDeclaration', declaration: [] }
    ]
  },

  // Aggregating modules

  {
    source: 'export * from "module-name";',
    expected: [
      { type: 'ExportAllDeclaration', source: 'module-name' }
    ]
  },
  {
    source: 'export * as name1 from "module-name";',
    expected: [
      { type: 'ExportNamedDeclaration', declaration: [] },
      {
        type: 'ExportNamespaceSpecifier',
        source: 'module-name',
        exported: 'name1'
      }
    ]
  },
  {
    source: 'export { name1, /* …, */ nameN } from "module-name";',
    expected: [
      { type: 'ExportNamedDeclaration', declaration: [] },
      {
        type: 'ExportSpecifier',
        source: 'module-name',
        exported: 'name1',
        local: 'name1'
      },
      {
        type: 'ExportSpecifier',
        source: 'module-name',
        exported: 'nameN',
        local: 'nameN'
      }
    ]
  },
  {
    source: 'export { import1 as name1, import2 as name2, /* …, */ nameN } from "module-name";',
    expected: [
      { type: 'ExportNamedDeclaration', declaration: [] },
      {
        type: 'ExportSpecifier',
        source: 'module-name',
        exported: 'name1',
        local: 'import1'
      },
      {
        type: 'ExportSpecifier',
        source: 'module-name',
        exported: 'name2',
        local: 'import2'
      },
      {
        type: 'ExportSpecifier',
        source: 'module-name',
        exported: 'nameN',
        local: 'nameN'
      }
    ]
  },
  {
    source: 'export { default, /* …, */ } from "module-name";',
    expected: [
      { type: 'ExportNamedDeclaration', declaration: [] },
      {
        type: 'ExportSpecifier',
        source: 'module-name',
        exported: 'default',
        local: 'default'
      }
    ]
  },
  {
    source: 'export { default as name1 } from "module-name";',
    expected: [
      { type: 'ExportNamedDeclaration', declaration: [] },
      {
        type: 'ExportSpecifier',
        source: 'module-name',
        exported: 'name1',
        local: 'default'
      }
    ]
  }
]
