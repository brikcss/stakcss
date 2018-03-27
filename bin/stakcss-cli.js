#! /usr/bin/env node
/** ------------------------------------------------------------------------------------------------
 *  @filename  stakcss-cli.js
 *  @author  brikcss  <https://github.com/brikcss>
 *  @description  CLI wrapper around stakcss.
 ** --------------------------------------------------------------------------------------------- */

// -------------------
// Set up environment.
//
const stak = require('../lib/stakcss.js');
const config = require('minimist')(process.argv.slice(1), {
	boolean: true,
	alias: {
		output: 'O',
		bundlers: 'B',
		cwd: 'R',
		config: 'C',
		watch: 'W',
		stakEachFile: 'E'
	}
});
config.cli = true;

// ------------
// Run stakcss.
//
stak(config);
