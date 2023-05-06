import * as R from 'ramda'

const MAGIC = 0x0815

class SomeClass {
  constructor (options) {
    this.options = options
    this.a = 42
  }

  classMethodA () {
    return Math.floor(Math.random() * 10)
  }

  classMethodB (params) {
    const sum = MAGIC / this.a * R.range(0, 10).reduce((a, b) => a + b)
    console.log(sum)
  }
}
