/**
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import?retiredLocale=de
 */

module.exports = [
  {
    source: 'import defaultExport from "module-name"',
    expected: [
      {
        type: 'ImportDefaultSpecifier',
        source: 'module-name',
        local: 'defaultExport'
      }
    ]
  }, 
  {
    source: 'import * as name from "module-name"',
    expected: [
      {
        type: 'ImportNamespaceSpecifier',
        source: 'module-name',
        local: 'name'
      }      
    ]
  },
  {
    source: 'import { export1 } from "module-name"',
    expected: [
      {
        type: 'ImportSpecifier',
        source: 'module-name',
        imported: 'export1',
        local: 'export1'
      }
    ]
  },
  {
    source: 'import { export1 as alias1 } from "module-name"',
    expected: [
      {
        type: 'ImportSpecifier',
        source: 'module-name',
        imported: 'export1',
        local: 'alias1'
      }
    ]
  },
  {
    source: 'import { default as alias } from "module-name"',
    expected: [
      {
        type: 'ImportSpecifier',
        source: 'module-name',
        imported: 'default',
        local: 'alias'
      }
    ]
  },
  {
    source: 'import { export1, export2 } from "module-name"',
    expected: [
      {
        type: 'ImportSpecifier',
        source: 'module-name',
        imported: 'export1',
        local: 'export1'
      },
      {
        type: 'ImportSpecifier',
        source: 'module-name',
        imported: 'export2',
        local: 'export2'
      }    
    ]
  },
  {
    source: 'import { export1, export2 as alias2, /* … */ } from "module-name"',
    expected: [
      {
        type: 'ImportSpecifier',
        source: 'module-name',
        imported: 'export1',
        local: 'export1'
      },
      {
        type: 'ImportSpecifier',
        source: 'module-name',
        imported: 'export2',
        local: 'alias2'
      }
    ]
  },
  {
    source: 'import { "string name" as alias } from "module-name"',
    expected: [
      {
        type: 'ImportSpecifier',
        source: 'module-name',
        imported: 'string name',
        local: 'alias'
      }    
    ]
  },
  {
    source: 'import defaultExport, { export1, /* … */ } from "module-name"',
    expected: [
      {
        type: 'ImportDefaultSpecifier',
        source: 'module-name',
        local: 'defaultExport'
      },
      {
        type: 'ImportSpecifier',
        source: 'module-name',
        imported: 'export1',
        local: 'export1'
      }
    ]
  },
  {
    source: 'import defaultExport, * as name from "module-name"',
    expected: [
      {
        type: 'ImportDefaultSpecifier',
        source: 'module-name',
        local: 'defaultExport'
      },
      {
        type: 'ImportNamespaceSpecifier',
        source: 'module-name',
        local: 'name'
      }
    ]
  },
  {
    source: 'import "module-name"',
    expected: []
  }
]
