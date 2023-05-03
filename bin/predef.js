const R = require('ramda')

module.exports = {
  fromEntries: Object.fromEntries,
  trace: tag => R.tap(x => console.log(tag, x))
}