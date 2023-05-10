const R = require('ramda')

// Node -> String
const type = R.prop('type')

// key :: ClassMethod -> String
const key = R.path(['key', 'name'])

// filename :: Node -> String
const filename = R.path(['loc', 'filename'])

// property :: MemberExpression -> String
const property = R.path(['property', 'name'])

module.exports = {
  fromEntries: Object.fromEntries,
  trace: tag => R.tap(x => console.log(tag, x)),
  type,
  key,
  filename,
  property
}