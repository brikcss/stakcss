/* eslint-env jest */
const rm = require('rimraf')
const fs = require('fs-extra')
const path = require('path')
const bundle = require('../lib/stakcss.js')

describe('stak()', () => {
  afterEach(() => {
    rm.sync('.temp')
  })

  it("fails if `source` and `content` don't exist.", () => {
    return bundle({ output: './.temp' }).then((result) => {
      expect(result instanceof Error).toBe(true)
    })
  })

  it('fails if `bundlers` does not exist.', () => {
    return bundle({ content: 'Testing, testing...', output: './.temp' }).then((result) => {
      expect(result instanceof Error).toBe(true)
    })
  })

  it('fails if a bundler returns an invalid config object.', () => {
    return bundle({
      source: 'test/fixtures/sample1/**/*',
      output: '.temp/one.md',
      bundlers: [
        (config = {}) => {
          config.source = false
          config.content = false
          return config
        },
        (config = {}) => {
          return config
        }
      ]
    }).then((result) => {
      expect(result instanceof Error).toBe(true)
    })
  })

  it('fails if source paths do not exist', () => {
    return bundle({
      source: 'test/i/dont/exist/*',
      output: '.temp/one.md',
      bundlers: [copyBundler]
    }).then((result) => {
      expect(result.success).toBe(false)
    })
  })

  it('runs with a config file.', () => {
    return bundle({ config: 'test/fixtures/configs/.stakcssrc.js' }).then((result) => {
      expect(result.config.content).toBe('I am content from .stakcssrc.js')
      expect(result.config.testing).toBe('test')
      expect(result.config.array).toEqual([1, 2])
      expect(fs.readFileSync('.temp/test.md', 'utf8')).toBe('I am content from .stakcssrc.js')
    })
  })

  it('runs a config profile', () => {
    return bundle({
      config: 'test/fixtures/configs/.stakcssrc-profiles.js',
      profiles: 'one'
    }).then((result) => {
      expect(result.config.content).toBe('I am content from .stakcssrc-profiles.js:one')
      expect(result.config.testing).toBe('one')
      expect(result.config.array).toEqual([1, 2])
      expect(fs.readFileSync('.temp/one.md', 'utf8')).toBe('I am content from .stakcssrc-profiles.js:one')
    })
  })

  it('runs multiple profiles with `config: <path>:<profiles>`', () => {
    return bundle({
      config: 'test/fixtures/configs/.stakcssrc-profiles.js',
      profiles: ['one', 'two']
    }).then((results) => {
      expect(results[0].config.content).toBe('I am content from .stakcssrc-profiles.js:one')
      expect(results[0].config.testing).toBe('one')
      expect(results[0].config.array).toEqual([1, 2])
      expect(fs.readFileSync('.temp/one.md', 'utf8')).toBe('I am content from .stakcssrc-profiles.js:one')
      expect(results[1].config.content).toBe('I am content from .stakcssrc-profiles.js:two')
      expect(results[1].config.testing).toBe('two')
      expect(results[1].config.array).toEqual([1, 2])
      expect(fs.readFileSync('.temp/two.md', 'utf8')).toBe('I am content from .stakcssrc-profiles.js:two')
    })
  })

  it('runs all profiles with `config: <path>:all`', () => {
    return bundle({
      config: 'test/fixtures/configs/.stakcssrc-profiles.js:all'
    }).then((results) => {
      expect(results[0].config.content).toBe('I am content from .stakcssrc-profiles.js:one')
      expect(results[0].config.testing).toBe('one')
      expect(results[0].config.array).toEqual([1, 2])
      expect(fs.readFileSync('.temp/one.md', 'utf8')).toBe('I am content from .stakcssrc-profiles.js:one')
      expect(results[1].config.content).toBe('I am content from .stakcssrc-profiles.js:two')
      expect(results[1].config.testing).toBe('two')
      expect(results[1].config.array).toEqual([1, 2])
      expect(fs.readFileSync('.temp/two.md', 'utf8')).toBe('I am content from .stakcssrc-profiles.js:two')
    })
  })

  it("returns content even if `output` doesn't exist.", () => {
    return bundle({
      content: 'Testing, testing...',
      bundlers: './test/fixtures/runners/sample2.js'
    }).then((result) => {
      expect(result.config.content).toBe('Testing sample2.js')
    })
  })

  it('runs with each item in `bundlers` as an object.', () => {
    return bundle({
      source: 'test/fixtures/sample1/**/*',
      output: '.temp/one.md',
      bundlers: [
        {
          run: (config = {}, bundler = {}) => {
            return new Promise((resolve) => {
              setTimeout(() => {
                config.success = [bundler.options.one]
                resolve(config)
              }, 20)
            })
          },
          options: {
            one: 1
          }
        },
        {
          run: './test/fixtures/runners/sample1.js',
          options: {
            two: 2
          }
        }
      ]
    }).then((result) => {
      expect(result.config.success).toEqual([1, 2])
    })
  })

  it('bundles `source` from a glob.', () => {
    return bundle({
      source: 'test/fixtures/sample1/**/*',
      output: '.temp/one.md',
      bundlers: [copyBundler]
    }).then(() => {
      expect(fs.readFileSync('.temp/one.md', 'utf8')).toBe(fs.readFileSync('test/expected/concatenated.md', 'utf8'))
    })
  })

  it('bundles `source` from a glob and outputs separate files with `stakEachFile`.', () => {
    return bundle({
      source: 'test/fixtures/sample1/**/*',
      output: '.temp/test1',
      bundlers: [copyBundler],
      stakEachFile: true
    }).then(() => {
      const filepaths = ['sample.md', 'sample.js']
      filepaths.forEach((filepath) => {
        expect(fs.readFileSync(path.join('.temp/test1', filepath), 'utf8')).toBe(fs.readFileSync(path.join('test/fixtures/sample1', filepath), 'utf8'))
      })
    })
  })

  it('bundles `source` from a directory and outputs separate files when `output` is a directory.', () => {
    return bundle({
      source: 'test/fixtures/sample1',
      output: '.temp/test1/',
      bundlers: [copyBundler]
    }).then(() => {
      const filepaths = ['sample.md', 'sample.js']
      filepaths.forEach((filepath) => {
        expect(fs.readFileSync(path.join('.temp/test1', filepath), 'utf8')).toBe(fs.readFileSync(path.join('test/fixtures/sample1', filepath), 'utf8'))
      })
    })
  })

  it('outputs multiple files and renames them with `rename` callback.', () => {
    return bundle({
      source: 'test/fixtures/sample1',
      output: '.temp/test1/',
      rename (filepath) {
        return path.join(path.dirname(filepath), 'test' + path.extname(filepath))
      },
      bundlers: [copyBundler]
    }).then(() => {
      const filepaths = ['sample.md', 'sample.js']
      filepaths.forEach((filepath) => {
        expect(fs.readFileSync('.temp/test1/test' + path.extname(filepath), 'utf8')).toBe(fs.readFileSync(path.join('test/fixtures/sample1', filepath), 'utf8'))
      })
    })
  })

  it('bundles `source` from an array of file paths and outputs as a single file when `output` is a filepath.', () => {
    return bundle({
      source: ['test/fixtures/sample1/sample.js', 'test/fixtures/sample1/sample.md'],
      output: '.temp/single-file.md',
      bundlers: [copyBundler]
    }).then(() => {
      expect(fs.readFileSync('.temp/single-file.md', 'utf8')).toBe(fs.readFileSync('test/expected/concatenated.md', 'utf8'))
    })
  })

  it('bundles `source` array of files as single files if `output` is an existing directory.', () => {
    fs.ensureDirSync('.temp')
    return bundle({
      source: ['test/fixtures/sample1/sample.md', 'test/fixtures/sample1/sample.js'],
      output: '.temp',
      bundlers: [copyBundler]
    }).then(() => {
      expect(fs.readFileSync('.temp/sample.md', 'utf8')).toBe(fs.readFileSync('test/fixtures/sample1/sample.md', 'utf8'))
      expect(fs.readFileSync('.temp/sample.js', 'utf8')).toBe(fs.readFileSync('test/fixtures/sample1/sample.js', 'utf8'))
    })
  })

  it('bundles `source` files and outputs relative to `root`.', () => {
    return bundle({
      source: ['test/fixtures/sample1/sample.md', 'test/fixtures/sample1/sample.js'],
      output: '.temp/',
      root: 'test/fixtures',
      bundlers: [copyBundler]
    }).then(() => {
      expect(fs.readFileSync('.temp/sample1/sample.md', 'utf8')).toBe(fs.readFileSync('test/fixtures/sample1/sample.md', 'utf8'))
      expect(fs.readFileSync('.temp/sample1/sample.js', 'utf8')).toBe(fs.readFileSync('test/fixtures/sample1/sample.js', 'utf8'))
    })
  })

  it('bundles with `bundlers` as a comma-separated list and each bundler a node require', () => {
    return bundle({
      source: ['test/fixtures/sample1/sample.md', 'test/fixtures/sample1/sample.js'],
      output: '.temp/sample.md',
      root: 'test/fixtures',
      bundlers: './test/fixtures/runners/sample2.js, ./test/fixtures/runners/sample3.js'
    }).then((result) => {
      expect(result.config.content).toBe('Testing sample2.js\nTesting sample3.js')
      expect(fs.readFileSync('.temp/sample.md', 'utf8')).toBe('Testing sample2.js\nTesting sample3.js')
    })
  })

  it('returns a watcher instance when run with `watch`', () => {
    return bundle({
      source: 'test/fixtures/sample1/**/*',
      output: '.temp/test1',
      bundlers: [copyBundler],
      watch: true
    }).then((result) => {
      expect(typeof result.watcher === 'object').toBe(true)
      expect(result.watcher._eventsCount).toBe(3)
      result.watcher.close()
    })
  })

  it('runs bundlers with node_modules', () => {
    return bundle({
      source: 'test/fixtures/sample1/**/*',
      output: '.temp/',
      bundlers: ['@brikcss/stakcss-bundler-copy']
    }).then(() => {
      expect(fs.readFileSync('.temp/sample.md', 'utf8')).toBe(fs.readFileSync('test/fixtures/sample1/sample.md', 'utf8'))
      expect(fs.readFileSync('.temp/sample.js', 'utf8')).toBe(fs.readFileSync('test/fixtures/sample1/sample.js', 'utf8'))
    })
  })

  it('runs bundlers with node_modules shorthand require syntax', () => {
    return bundle({
      source: 'test/fixtures/sample1/**/*',
      output: '.temp/',
      bundlers: ['@brikcss/copy']
    }).then(() => {
      expect(fs.readFileSync('.temp/sample.md', 'utf8')).toBe(fs.readFileSync('test/fixtures/sample1/sample.md', 'utf8'))
      expect(fs.readFileSync('.temp/sample.js', 'utf8')).toBe(fs.readFileSync('test/fixtures/sample1/sample.js', 'utf8'))
    })
  })
})

function copyBundler (config) {
  return new Promise((resolve) => {
    (config.source instanceof Array ? config.source : [config.source]).forEach((filepath) => {
      config.content += fs.readFileSync(filepath, 'utf8')
    })
    resolve(config)
  })
}
