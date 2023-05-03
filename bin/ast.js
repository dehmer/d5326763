#!/usr/bin/env node
const fs = require('fs')
const R = require('ramda')
const { globSync: glob } = require('glob')
const parser = require('@babel/parser')
const { relations } = require('./traverse')
const { fromEntries, trace } = require('./predef')

const filenames = glob('src/ol/**/*.js')
const readFile = filename => ({ filename, source: fs.readFileSync(filename, 'utf8')})
const parseCode = code => parser.parse(code, { sourceType: 'module' })
const script = file => ({ ...file, ast: parseCode(file.source) })

const moduleEntries = R.compose(
  R.map(relations),
  R.map(script),
  R.map(readFile),
  // R.filter(filename => filename === 'src/ol/Map.js')
  // R.filter(filename => filename === 'src/ol/xml.js')
  // R.filter(filename => filename === 'src/ol/style.js')
)

const modules = fromEntries(moduleEntries(filenames))
console.log(JSON.stringify(modules, null, 2))
