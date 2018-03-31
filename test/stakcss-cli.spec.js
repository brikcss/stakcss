/* eslint-env mocha */
const assert = require('assert');
const rm = require('rimraf');
const exec = require('shelljs').exec;
const fs = require('fs-extra');
const path = require('path');
const cliPath = 'bin/stakcss-cli.js';

describe('stakcss-cli()', function() {
	this.timeout(3000);

	afterEach(() => {
		rm.sync('.temp');
	});

	it("fails if `source` and `content` don't exist.", () => {
		const result = exec(`node ${cliPath} --output=.temp`);
		assert.ok(result.stderr);
	});

	it('fails if `bundlers` does not exist.', () => {
		const result = exec(`node ${cliPath} --content="Testing, testing..." --output=.temp`);
		assert.ok(result.stderr);
	});

	it('runs with a config file.', () => {
		const result = exec(`node ${cliPath} --config=test/fixtures/configs/.stakcssrc.js`);
		assert.equal(result.code, 0);
		assert.equal(fs.readFileSync('.temp/test.md', 'utf8'), 'I am content from .stakcssrc.js');
	});

	it('runs a config profile.', () => {
		const result = exec(
			`node ${cliPath} --config=test/fixtures/configs/.stakcssrc-profiles.js --profiles=one`
		);
		assert.equal(result.code, 0);
		assert.equal(
			fs.readFileSync('.temp/one.md', 'utf8'),
			'I am content from .stakcssrc-profiles.js:one'
		);
	});

	it('runs with `--config=true` and `--cwd=<path>`', () => {
		const result = exec(`node ${cliPath} --config --cwd=./test/fixtures/configs`);
		assert.equal(result.code, 0);
		assert.equal(fs.readFileSync('.temp/test.md', 'utf8'), 'I am content from .stakcssrc.js');
	});

	it('runs a profile with `--config=<path>:<profile>`.', () => {
		const result = exec(
			`node ${cliPath} --config=test/fixtures/configs/.stakcssrc-profiles.js:one`
		);
		assert.equal(result.code, 0);
		assert.equal(
			fs.readFileSync('.temp/one.md', 'utf8'),
			'I am content from .stakcssrc-profiles.js:one'
		);
	});

	it('runs multiple profiles with `--config=<path>:<profiles>`.', () => {
		const results = exec(
			`node ${cliPath} --config=test/fixtures/configs/.stakcssrc-profiles.js:one,two`
		);
		assert.equal(results.code, 0);
		assert.equal(
			fs.readFileSync('.temp/one.md', 'utf8'),
			'I am content from .stakcssrc-profiles.js:one'
		);
		assert.equal(
			fs.readFileSync('.temp/two.md', 'utf8'),
			'I am content from .stakcssrc-profiles.js:two'
		);
	});

	it('runs all profiles with `--config=<path>:all`', () => {
		const results = exec(
			`node ${cliPath} --config=test/fixtures/configs/.stakcssrc-profiles.js:all`
		);
		assert.equal(results.code, 0);
		assert.equal(
			fs.readFileSync('.temp/one.md', 'utf8'),
			'I am content from .stakcssrc-profiles.js:one'
		);
		assert.equal(
			fs.readFileSync('.temp/two.md', 'utf8'),
			'I am content from .stakcssrc-profiles.js:two'
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
