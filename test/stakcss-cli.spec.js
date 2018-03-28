/* eslint-env mocha */
const assert = require('assert');
const rm = require('rimraf');
const exec = require('shelljs').exec;
const fs = require('fs-extra');
const path = require('path');
const cliPath = 'bin/stakcss-cli.js';

describe('stakcss-cli()', () => {
	afterEach(() => {
		rm.sync('.temp');
	});

	it("fails if `source` and `content` don't exist.", () => {
		const result = exec(`node ${cliPath} --output=.temp`);
		assert.ok(result.stderr);
		assert.equal(result.code, 1);
	});

	it('fails if `bundlers` does not exist.', () => {
		const result = exec(`node ${cliPath} --content="Testing, testing..." --output=.temp`);
		assert.ok(result.stderr);
		assert.equal(result.code, 1);
	});

	it('runs with a config file.', () => {
		const result = exec(`node ${cliPath} --config=test/fixtures/configs/.stakcssrc.js`);
		assert.equal(result.code, 0);
		assert.equal(
			fs.readFileSync('.temp/test.md', 'utf8'),
			'I am content from .brik-bundler.js'
		);
	});

	it('runs with a config file and a profile.', () => {
		const result = exec(
			`node ${cliPath} --config=test/fixtures/configs/.stakcssrc-profiles.js --profile=one`
		);
		assert.equal(result.code, 0);
		assert.equal(
			fs.readFileSync('.temp/test.md', 'utf8'),
			'I am content from .brik-bundler.js'
		);
	});

	it('runs with bundlers option', () => {
		const result = exec(
			`node ${cliPath} --content="Testing, testing..." --bundlers="./test/fixtures/runners/sample2.js, ./test/fixtures/runners/sample3.js" --output=.temp/sample.js`
		);
		assert.equal(result.code, 0);
		assert.equal(
			fs.readFileSync('.temp/sample.js', 'utf8'),
			'Testing sample2.js\nTesting sample3.js'
		);
	});

	it('bundles `source` from a glob.', () => {
		const result = exec(
			`node ${cliPath} test/fixtures/sample1/**/* --output=.temp/one.md --bundlers=./test/fixtures/runners/concat.js`
		);
		assert.equal(result.code, 0);
		assert.equal(
			fs.readFileSync('.temp/one.md', 'utf8'),
			fs.readFileSync('test/expected/concatenated.md', 'utf8')
		);
	});

	it('bundles `source` from a glob and outputs separate files.', () => {
		const result = exec(
			`node ${cliPath} test/fixtures/sample1/**/* --output=.temp/ --bundlers=./test/fixtures/runners/concat.js`
		);
		assert.equal(result.code, 0);
		['sample.md', 'sample.js'].forEach((filepath) => {
			assert.equal(
				fs.readFileSync(path.join('.temp/', filepath), 'utf8'),
				fs.readFileSync(path.join('test/fixtures/sample1', filepath), 'utf8')
			);
		});
	});

	it('outputs separate files and renames with [name] and [ext].', () => {
		const result = exec(
			`node ${cliPath} test/fixtures/sample1/**/* --output=.temp/test-[name].[ext] --bundlers=./test/fixtures/runners/concat.js`
		);
		assert.equal(result.code, 0);
		['sample.md', 'sample.js'].forEach((filepath) => {
			assert.equal(
				fs.readFileSync(path.join('.temp/', 'test-' + filepath), 'utf8'),
				fs.readFileSync(path.join('test/fixtures/sample1', filepath), 'utf8')
			);
		});
	});
});
