/**
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export
 */

module.exports = [

  // Exporting declarations

  {
    source: 'export let name1, name2/*, … */; // also var',
    expected: [
      ['ExportNamedDeclaration', 'name1'],
      ['ExportNamedDeclaration', 'name2'],
    ]
  }, 
  {
    source: 'export const name1 = 1, name2 = 2/*, … */; // also var, let',
    expected: [
      ['ExportNamedDeclaration', 'name1'],
      ['ExportNamedDeclaration', 'name2']
    ]
  }, 
  {
    source: 'export function functionName() { /* … */ }',
    expected: [['ExportNamedDeclaration', 'functionName']]
  }, 
  {
    source: 'export class ClassName { /* … */ }',
    expected: [['ExportNamedDeclaration', 'ClassName']]
  }, 
  {
    source: 'export function* generatorFunctionName() { /* … */ }',
    expected: [['ExportNamedDeclaration', 'generatorFunctionName']]
  }, 
  {
    source: 'export const { name1, name2: bar } = o;',
    expected: []
  }, 
  {
    source: 'export const [ name1, name2 ] = array;',
    expected: []
  }, 

  // Export list

  {
    source: 'let name1, nameN; export { name1, /* …, */ nameN };',
    expected: [
      ['ExportSpecifier', undefined, 'name1', 'name1'],
      ['ExportSpecifier', undefined, 'nameN', 'nameN']
    ]
  }, 
  {
    source: 'let variable1, variable2, nameN; export { variable1 as name1, variable2 as name2, /* …, */ nameN };',
    expected: [
      ['ExportSpecifier', undefined, 'name1', 'variable1'],
      ['ExportSpecifier', undefined, 'name2', 'variable2'],
      ['ExportSpecifier', undefined, 'nameN', 'nameN']
    ]
  }, 
  {
    source: 'let variable1; export { variable1 as "string name" };',
    expected: [['ExportSpecifier', undefined, 'string name', 'variable1']]
  }, 
  {
    source: 'let name1; export { name1 as default /*, … */ };',
    expected: [['ExportSpecifier', undefined, 'default', 'name1']]
  }, 

  // Default exports

  {
    source: 'export default expression;',
    expected: [['ExportDefaultDeclaration', 'expression']]
  }, 
  {
    source: 'export default function functionName() { /* … */ }',
    expected: [['ExportDefaultDeclaration', 'functionName']]
  }, 
  {
    source: 'export default class ClassName { /* … */ }',
    expected: [['ExportDefaultDeclaration', 'ClassName']]
  }, 
  {
    source: 'export default function* generatorFunctionName() { /* … */ }',
    expected: [['ExportDefaultDeclaration', 'generatorFunctionName']]
  }, 
  {
    source: 'export default function () { /* … */ }',
    expected: []
  }, 
  {
    source: 'export default class { /* … */ }',
    expected: []
  }, 
  {
    source: 'export default function* () { /* … */ }',
    expected: []
  }, 

  // Aggregating modules

  {
    source: 'export * from "module-name";',
    expected: [['ExportAllDeclaration', 'module-name']]
  }, 
  {
    source: 'export * as name1 from "module-name";',
    expected: [['ExportNamespaceSpecifier', 'module-name', 'name1']]
  }, 
  {
    source: 'export { name1, /* …, */ nameN } from "module-name";',
    expected: [
      ['ExportSpecifier', 'module-name', 'name1', 'name1'],
      ['ExportSpecifier', 'module-name', 'nameN', 'nameN']
    ]
  }, 
  {
    source: 'export { import1 as name1, import2 as name2, /* …, */ nameN } from "module-name";',
    expected: [
      ['ExportSpecifier', 'module-name', 'name1', 'import1'],
      ['ExportSpecifier', 'module-name', 'name2', 'import2'],
      ['ExportSpecifier', 'module-name', 'nameN', 'nameN']
    ]
  }, 
  {
    source: 'export { default, /* …, */ } from "module-name";',
    expected: [['ExportSpecifier', 'module-name', 'default', 'default']]
  }, 
  {
    source: 'export { default as name1 } from "module-name";',
    expected: [['ExportSpecifier', 'module-name', 'name1', 'default']]
  }
]
