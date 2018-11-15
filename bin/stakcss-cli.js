#! /usr/bin/env node
/*! stakcss-cli.js | @author brikcss <https://github.com/brikcss> | @reference https://github.com/brikcss/stakcss */

// -------------------
// Set up environment.
//
const stak = require('../lib/stakcss.js')
const config = require('minimist')(process.argv.slice(2), {
  boolean: true,
  alias: {
    output: 'O',
    bundlers: 'B',
    cwd: 'R',
    config: 'C',
    watch: 'W',
    stakEachFile: 'E'
  }
})
config.source = config._
config.cli = true

// ------------
// Run stakcss.
//
stak(config)
