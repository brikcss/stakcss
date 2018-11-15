# Stakcss

> Stakcss takes a "stak" of files or input, runs it all through a "stak" of configured bundlers (not included), and outputs compiled result, optionally saving to disk. Stakcss works similarly to tools like webpack, rollup, and postcss. The primary difference is that Stakcss can bundle or compile any type of file or content, where others only bundle one specific. Alone Stakcss doesn't do much, but in concert with bundlers it can do almost anything your heart desires.

<!-- Shields. -->
<p>
	<!-- NPM version. -->
	<a href="https://www.npmjs.com/package/@brikcss/stakcss">
		<img alt="NPM version" src="https://img.shields.io/npm/v/@brikcss/stakcss.svg?style=flat-square">
	</a>
	<!-- NPM downloads/month. -->
	<a href="https://www.npmjs.com/package/@brikcss/stakcss">
		<img alt="NPM downloads per month" src="https://img.shields.io/npm/dm/@brikcss/stakcss.svg?style=flat-square">
	</a>
	<!-- Travis branch. -->
	<a href="https://github.com/brikcss/stakcss/tree/master">
		<img alt="Travis branch" src="https://img.shields.io/travis/rust-lang/rust/master.svg?style=flat-square&label=master">
	</a>
	<!-- Codacy grade. -->
	<a href="https://www.codacy.com/app/thezimmee/stakcss">
		<img alt="NPM version" src="https://img.shields.io/codacy/grade/28adee991e004621b2a9bece53370661/master.svg?style=flat-square">
	</a>
	<!-- Codacy coverage. -->
	<a class="badge-align" href="https://www.codacy.com/app/thezimmee/stakcss">
		<img src="https://img.shields.io/codacy/coverage/28adee991e004621b2a9bece53370661/master.svg?style=flat-square"/>
	</a>
	<!-- Coveralls coverage. -->
	<a href='https://coveralls.io/github/brikcss/stakcss?branch=master'>
		<img src='https://img.shields.io/coveralls/github/brikcss/stakcss/master.svg?style=flat-square' alt='Coverage Status' />
	</a>
	<!-- Commitizen friendly. -->
	<a href="http://commitizen.github.io/cz-cli/">
		<img alt="Commitizen friendly" src="https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=flat-square">
	</a>
	<!-- Semantic release. -->
	<a href="https://github.com/semantic-release/semantic-release">
		<img alt="semantic release" src="https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square">
	</a>
	<!-- Prettier code style. -->
	<a href="https://prettier.io/">
		<img alt="code style: prettier" src="https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square">
	</a>
	<!-- MIT License. -->
	<!-- <a href="https://choosealicense.com/licenses/mit/">
		<img alt="License" src="https://img.shields.io/npm/l/express.svg?style=flat-square">
	</a> -->
</p>

## Environment support

| Node | ES Module | Browser | UMD | CLI |
| :--: | :-------: | :-----: | :-: | :-: |
|  ✓   |     x     |    x    |  x  |  ✓  |

## Install

```sh
npm install @brikcss/stakcss --save-dev
```

## Terminology

Just to be clear:

- _Stakcss_: This bundler tool.
- _stak (noun)_: A "stack" of source files or content chunks to be bundled, or processed, in a desired manner.
- _bundler_: A function which processes a "stak" of files or content chunks in a specific way. Each stak can be run through one or more bundlers to achieve a desired result.
- _bundle (noun)_: The output returned by the bundler(s).
- _bundle / stak (verb)_: The process of running one or more _staks_ through a series of one or more _bundlers_ to be output to a single bundle.

## Usage

Stakcss provides an API to run files or content through a series of bundlers. See below for [creating a bundler](#creating-a-bundler). You may bundle a stak in Node or the command line:

- Node:
  `js const stak = require('@brikcss/stakcss'); stak(options);`
- CLI:
  `sh stak <source files> [options] # or: node node_modules/.bin/stak <source files> [options]`

### Options

- **`source`** _{String | Array | Glob}_ (_required_) Source file paths.

- **`content`** _{String}_ Source content.

- **`output`** _{String}_ (_required_) Output path. _Note: If this is directory (either '/' as last character or an actual directory), OR if it contains `[name]` or `[ext]`, then `stakEachFile` is automatically set to true and each file is treated as its own stak. `[name]` and `[ext]` provide the template for the output path. See `stakEachFile` for more details._

- **`bundlers`** _{Array | String}_ (_required_) List of bundlers to run the stak through. A _{String}_ should be a comma-separated list. Each bundler can be any of the following:

      	- _{String}_ path to node module, which is `require`d like any other node module.
      	- _{Function}_ (via Node or config file) which is run on each stak.
      	- _{Object}_ (via Node or config file) where:
      		- **`bundler.run`** is the function to be run on each stak.
      		- **`bundler.*`** can be provided by user for bundler configuration. The `bundler` object is passed to each stak (see [creating a bundler](#creating-a-bundler)).

      	_Note: Stakcss Bundler module names should be prefixed with `stakcss-bundler-`. For convenience, when referencing bundlers by name in the `bundlers` setting, you may optionally remove `stakcss-bundler-` from the name and Stakcss will still pick the module up. For example: `bundlers: ['@brikcss/stakcss-bundler-copy']` and `bundlers: ['@brikcss/copy']` will both pick run the `@brikcss/stakcss-bundler-copy` bundler._

- **`root`** _{String}_ (`.`) Source paths will be output relative to this directory.

- **`cwd`** _{String}_ (`process.cwd()`) Current working directory. Affects bundler path resolution and default search path for the config file.

- **`rename`** _{Function}_ (via Node or config file) Callback to allow user to rename output files. Useful when `output` is a directory.

- **`config`** _{String}_ Path to config file. You can also use the shorthand syntax to set the config path and `profiles` to run at the same time. For example:

      	```sh
      	stak --config=<path>:<profiles>
      	```

- **`profiles`** _{String | Array}_ The config file can be set up to run multiple "profiles". In this case, each property name in the config file is a config profile. This option is passed to tell Stakcss which profile(s) to run. An array or comma-separated list will run multiple profiles. Or setting this property to `all` will run all profiles.

      	```sh
      	stak --config=<path> --profiles=<profiles>
      	```

      	```sh
      	# Run all profiles in the config file.
      	stak --config=<path> --profiles=all
      	```

      	You may also use the shorthand version with the `config` option as follows:

      	```sh
      	stak --config=<path>:<profiles>
      	```

- **`id`** _{String}_ ID or name of stak, used in log notifications. Defaults to profile property name, if exists, or the profile index.

- **`stakEachFile`** _{Boolean}_ (`false`) Whether to treat each file as its own stak. This option is automatically set to `true` if:

      	- `output` ends with `/`.
      	- `output` is a directory.
      	- `output` contains `[name]`.

      	_`output` path template:_
      	When `stakEachFile` is true and `output` exists, Stakcss replaces `[name]` and `[ext]` with source file path's `name` and `ext`. If `[name]` is not found in `output`, `output` is set to `path.join(output, '[name].[ext]')`.

- **`watch`** _{Boolean}_ Watch source file paths and "restak" when they change.

- **`watchPaths`** _{Glob}_ Additional path(s) to watch when running the watcher. These paths do not get bundled, but when they change they will trigger a rebundle. It may be useful to include files in the watcher that the source files depend on.

_Note: Some options, as noted above, are not available via the CLI unless you use a config file._

## Creating a bundler

Creating a bundler is easy. To illustrate, here is a simple bundler:

```js
const fs = require('fs-extra');

module.exports = (config = {}, bundler = {}) => {
  if (!config.content) {
    config.source.forEach((filepath) => (config.content += fs.readFileSync(filepath, 'utf8')));
  }
  return config;
};
```

This bundler copies file content from `config.source` to `config.content`, which Stakcss will later output to `config.output`. Simple enough, but it paints the picture. Note the following:

- `config` is the user's config object and contains the list of accepted options.
- `bundler` is optionally provided by the user and can be anything. It is intended to pass settings to each individual bundler.

### Rules for creating a bundler

1.  Stakcss global config is provided via `config`. Bundler specific config is provided via `bundler`. Except for `config.content` and `config.sourceMap`, these should generally not be modified.
2.  **Important**: If `config.content` does not exist:
    1.  Use `config.source` to get source content.
    2.  Modify it to your heart's content.
    3.  Save it to `config.content`.
3.  You must return the `config` object with the newly bundled / transformed `config.content`.
4.  You can optionally return a `Promise`. Stakcss will keep bundler results in order.
5.  `config.sourceMap` is for use with sourcemaps.
