#!/usr/bin/env node

const fs = require('fs-extra')
const path = require('path')
const pkg = require('../package.json')

const argv = require('minimist')(process.argv.slice(2), {
  alias: {
    h: 'help',
    v: 'version',
    o: 'output',
    b: 'blueprint'
  },
  boolean: ['help', 'porcelain', 'version', 'progress', 'publish'],
  string: ['blueprint', 'download', 'output', 'array', 'ignore', 'raw']
})

if (argv.help) {
  console.log(pkg.name)
  console.log(pkg.description, '\n')
  console.log(fs.readFileSync(path.join(__dirname, 'USAGE'), 'utf8'))
  process.exit(0)
}

if (argv.version) {
  console.log(pkg.version)
  process.exit(0)
}

require('../lib')(Object.assign({}, argv, {
  input: argv._[0] && path.join(process.cwd(), argv._[0])
})).catch(e => {
  console.error(e.message)
  console.error(`\nTry '${pkg.name} --help'`)
  process.exit(1)
})
