/**
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import?retiredLocale=de
 */

module.exports = [
  {
    source: 'import defaultExport from "module-name"',
    expected: [['ImportDefaultSpecifier', 'module-name', 'defaultExport']]
  }, 
  {
    source: 'import * as name from "module-name"',
    expected: [['ImportNamespaceSpecifier', 'module-name', 'name']]
  },
  {
    source: 'import { export1 } from "module-name"',
    expected: [['ImportSpecifier', 'module-name', 'export1', 'export1']]
  },
  {
    source: 'import { export1 as alias1 } from "module-name"',
    expected: [['ImportSpecifier', 'module-name', 'export1', 'alias1']]
  },
  {
    source: 'import { default as alias } from "module-name"',
    expected: [['ImportSpecifier', 'module-name', 'default', 'alias']]
  },
  {
    source: 'import { export1, export2 } from "module-name"',
    expected: [
      ['ImportSpecifier', 'module-name', 'export1', 'export1'],
      ['ImportSpecifier', 'module-name', 'export2', 'export2']
    ]
  },
  {
    source: 'import { export1, export2 as alias2, /* … */ } from "module-name"',
    expected: [
      ['ImportSpecifier', 'module-name', 'export1', 'export1'],
      ['ImportSpecifier', 'module-name', 'export2', 'alias2']
    ]
  },
  {
    source: 'import { "string name" as alias } from "module-name"',
    expected: [
      ['ImportSpecifier', 'module-name', 'string name', 'alias']
    ]
  },
  {
    source: 'import defaultExport, { export1, /* … */ } from "module-name"',
    expected: [
      ['ImportDefaultSpecifier', 'module-name', 'defaultExport'],
      ['ImportSpecifier', 'module-name', 'export1', 'export1']
    ]
  },
  {
    source: 'import defaultExport, * as name from "module-name"',
    expected: [
      ['ImportDefaultSpecifier', 'module-name', 'defaultExport'],
      ['ImportNamespaceSpecifier', 'module-name', 'name']
    ]
  },
  {
    source: 'import "module-name"',
    expected: []
  }
]
