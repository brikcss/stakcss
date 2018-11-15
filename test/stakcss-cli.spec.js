/* eslint-env jest */
const rm = require('rimraf')
const exec = require('shelljs').exec
const fs = require('fs-extra')
const path = require('path')
const cliPath = 'bin/stakcss-cli.js'

jest.setTimeout(3000)

afterEach(() => {
  rm.sync('.temp')
})

test('runs with `--config=true` and `--cwd=<path>`', () => {
  const result = exec(`node ${cliPath} --config --cwd=./test/fixtures/configs`)
  expect(result.code).toBe(0)
  expect(fs.readFileSync('.temp/test.md', 'utf8')).toBe('I am content from .stakcssrc.js')
})

test('runs a profile with `--config=<path>:<profiles>`.', () => {
  const result = exec(
    `node ${cliPath} --config=test/fixtures/configs/.stakcssrc-profiles.js:one`
  )
  expect(result.code).toBe(0)
  expect(fs.readFileSync('.temp/one.md', 'utf8')).toBe('I am content from .stakcssrc-profiles.js:one')
})

test('runs multiple profiles with `--config=<path>:<profiles>`.', () => {
  const results = exec(
    `node ${cliPath} --config=test/fixtures/configs/.stakcssrc-profiles.js:one,two`
  )
  expect(results.code).toBe(0)
  expect(fs.readFileSync('.temp/one.md', 'utf8')).toBe('I am content from .stakcssrc-profiles.js:one')
  expect(fs.readFileSync('.temp/two.md', 'utf8')).toBe('I am content from .stakcssrc-profiles.js:two')
})

test('runs a config with NODE_ENV=development', () => {
  exec(
    `NODE_ENV=development node ${cliPath} --config=test/fixtures/configs/.stakcssrc-envs.js:all`
  )
  expect(fs.readFileSync('.temp/one.js', 'utf8')).toBe('I am content from .stakcssrc-envs.js:development')
})

test('runs a config with NODE_ENV=production', () => {
  exec(
    `NODE_ENV=production node ${cliPath} --config=test/fixtures/configs/.stakcssrc-envs.js:all`
  )
  expect(fs.readFileSync('.temp/one.js', 'utf8')).toBe('I am content from .stakcssrc-envs.js:production')
  expect(fs.readFileSync('.temp/one.min.js', 'utf8')).toBe('I am content from .stakcssrc-envs.js:production:minified')
})

test('runs with bundlers option', () => {
  const result = exec(
    `node ${cliPath} --content="Testing, testing..." --bundlers="./test/fixtures/runners/sample2.js, ./test/fixtures/runners/sample3.js" --output=.temp/sample.js`
  )
  expect(result.code).toBe(0)
  expect(fs.readFileSync('.temp/sample.js', 'utf8')).toBe('Testing sample2.js\nTesting sample3.js')
})

test('bundles `source` from a glob and outputs separate files.', () => {
  const result = exec(
    `node ${cliPath} test/fixtures/sample1/**/* --output=.temp/ --bundlers=./test/fixtures/runners/concat.js`
  )
  expect(result.code).toBe(0);
  ['sample.md', 'sample.js'].forEach((filepath) => {
    expect(fs.readFileSync(path.join('.temp/', filepath), 'utf8')).toBe(fs.readFileSync(path.join('test/fixtures/sample1', filepath), 'utf8'))
  })
})

test('outputs separate files and renames with [name] and [ext].', () => {
  const result = exec(
    `node ${cliPath} test/fixtures/sample1/**/* --output=.temp/test-[name].[ext] --bundlers=./test/fixtures/runners/concat.js`
  )
  expect(result.code).toBe(0);
  ['sample.md', 'sample.js'].forEach((filepath) => {
    expect(fs.readFileSync(path.join('.temp/', 'test-' + filepath), 'utf8')).toBe(fs.readFileSync(path.join('test/fixtures/sample1', filepath), 'utf8'))
  })
})
