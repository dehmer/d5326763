#!/usr/bin/env node
const fs = require('fs')
const R = require('ramda')
const { globSync: glob } = require('glob')
const parser = require('@babel/parser')
const traverse = require('./traverse')

const filenames = glob('src/ol/**/*.js')
const readFile = filename => ({ filename, source: fs.readFileSync(filename, 'utf8') })
const parserOptions = filename => ({ sourceType: 'module', sourceFilename: filename })
const parseCode = file => parser.parse(file.source, parserOptions(file.filename))
const script = file => parseCode(file)

const moduleEntries = R.compose(
  R.map(traverse),
  R.map(script),
  R.map(readFile),
  // R.filter(filename => filename === 'src/ol/Map.js')
  // R.filter(filename => filename === 'src/ol/xml.js')
  // R.filter(filename => filename === 'src/ol/style.js')
)

const relations = [].concat(...moduleEntries(filenames))
// console.log('relations', relations.length)
console.log(JSON.stringify(relations, null, 2))
