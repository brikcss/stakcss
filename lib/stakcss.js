/** ------------------------------------------------------------------------------------------------
 *  @filename  stakcss.js
 *  @author  brikcss  <https://github.com/brikcss>
 *  @description  Stakcss takes a collection of files or data, runs them through a series of
 *      bundlers (not included), and outputs bundled data, optionally saved to disk.
 *
 *  @param  {String|Array|Glob}  source  Source file paths.
 *  @param  {String}  content  Source content.
 *  @param  {String}  output  Output destination. If this is a directory, it will treat each file as
 *      its own stak and output to <output>/<source basename>.
 *  @param  {Array|String}  bundlers  List of bundlers to bundle stak with. A string should be a
 *      comma-separated list, which is split to an Array.
 *  @param  {String}  cwd (process.cwd())  Current working directory. Source file paths will be
 *      relative to cwd.
 *  @param  {Function}  rename  Callback to rename output files. Useful when output is a directory.
 *  @param  {String}  config  Path to config file.
 *  @param  {Boolean}  stakEachFile (false)  Treats each file as its own stak.
 *  @param  {Boolean}  watch (false)  Watch source file paths for changes and "restak" on change.
 ** --------------------------------------------------------------------------------------------- */

// -------------------
// Set up environment.
//
const path = require('path');
const fs = require('fs-extra');
const log = require('loglevel');
const timer = require('@brikcss/timer');
const merge = require('@brikcss/merge');
const globby = require('globby');

/**
 *  Main stakcss controller function.
 *
 *  @param   {Object}  config  Stakcss configuration object.
 *  @return  {Promise}  Returns the config object, the result of each bundler, and the watcher, if
 *      one exists.
 */
function stakcss(config = {}) {
	config = normalizeConfig(config);
	return runAllStaks(config).catch((error) => {
		log.error(error);
		return error;
	});
}

/**
 *  Run all stakcss. Iterates through each stak and returns a promise for each.
 */
function runAllStaks(config = {}) {
	const bundlePromises = [];
	if (config.stakEachFile) {
		config.source.forEach((filepath) => {
			let output = config.output;
			// Determine output path based on cwd.
			if (config.stakEachFile) {
				// Set full output path, replacing template placeholders.
				output = path
					.join(
						path.dirname(config.output),
						config.cwd ? path.relative(config.cwd, path.dirname(filepath)) : '',
						path.basename(output)
					)
					.replace(/\[name\]/g, path.basename(filepath, path.extname(filepath)))
					.replace(/\[ext\]/g, path.extname(filepath).replace('.', ''));
				// Run rename callback.
				if (typeof config.rename === 'function') {
					output = config.rename(output, config);
				}
				// Make source path iterable.
				filepath = [filepath];
			}
			// Run the stak.
			bundlePromises.push(
				runStack(
					Object.assign({}, config, {
						source: filepath,
						output
					})
				)
			);
		});
	} else {
		bundlePromises.push(runStack(config));
	}

	// After all promises complete, save to output location.
	return Promise.all(bundlePromises).then((results) => {
		// Create return object.
		const result = {
			config: config,
			all: results,
			watcher: undefined,
			success: false
		};
		// Notify user if no results or content was returned.
		if (!results || !results.length) {
			throw new Error('[!!] Uh oh... no results were returned.');
		} else if (!results[results.length - 1].content) {
			log.error(
				'[!!] No content was returned. Something may have gone wrong with your configuration or the bundler(s).'
			);
		} else {
			result.success = true;
			result.config = Object.assign(result.config, {
				content: results[results.length - 1].content
			});
		}
		// Optionally watch the source and watchPath files.
		if (config.watch && !config.hasWatcher) {
			const chokidar = require('chokidar');
			result.watcher = chokidar.watch(config.source.concat(config.watchPaths || []), {
				// persistent: true,
				// followSymlinks: true,
				// disableGlobbing: true
				alwaysStat: true
			});
			result.watcher
				.on('change', (path, stats) => {
					timer.start(path);
					config.content = '';
					return runAllStaks(config)
						.then(() => {
							stats.size = stats
								? stats.size > 1024
									? Math.ceil(stats.size / 1024) + 'k'
									: stats.size + 'b'
								: '';
							timer.stop(path);
							log.error(
								`[i] ${path} was modified (${timer.duration(path) +
									(stats.size ? ' - ' + stats.size : '')}).`
							);
							timer.clear(path);
						})
						.catch((error) => {
							log.error(error);
							return error;
						});
				})
				.on('error', (error) => {
					log.error(`[i] Error: ${error}`);
					return error;
				})
				.on('ready', () => {
					config.hasWatcher = true;
					log.error('[i] Ready!');
					return config.watcher;
				});
		}
		// Return the result object.
		log.warn('[i] Done!');
		return result;
		// })
		// .catch((error) => {
		// 	log.error('1', error);
		// 	return error;
	});
}

/**
 *  Runs a single stak. Passes config to each bundler and then outputs the result. See
 *  https://stackoverflow.com/questions/24660096/correct-way-to-write-loops-for-promise#answer-24985483
 *  for a solid method of looping through promises.
 */
function runStack(config = {}) {
	return (
		config.bundlers
			// Run stak through each bundler.
			.reduce((promise, bundler, i) => {
				return promise.then((configResult) => {
					// Validate new config object.
					validateConfig(configResult);
					// Normalize bundler.
					if (typeof bundler !== 'object') {
						bundler = {
							run: bundler,
							options: {}
						};
						configResult.bundlers[i] = bundler;
					}
					if (typeof bundler.run === 'string') {
						bundler.run =
							bundler.run.indexOf('./') === 0 || bundler.run.indexOf('../') === 0
								? require(path.resolve(process.cwd(), bundler.run))
								: require(bundler.run);
					}
					if (typeof bundler.run !== 'function') {
						throw new Error(
							`bundler is not a function or can not be found. ${bundler.run}`
						);
					}
					// Run the bundler.
					return bundler.run(configResult, bundler);
				});
			}, Promise.resolve(config))
			// Save the output file(s).
			.then((configResult) => {
				// Save the file and source map.
				if (configResult.output) {
					const promises = [];
					promises.push(fs.outputFile(configResult.output, configResult.content));
					if (configResult.sourceMap) {
						promises.push(
							fs.outputFile(configResult.output + '.map', configResult.sourceMap)
						);
					}
					return Promise.all(promises).then(() => configResult);
				}
				return configResult;
			})
	);
}

/**
 *  Validates config object. This should be run after each bundler to ensure it returns a valid
 *  config object.
 */
function validateConfig(config = {}) {
	// Validate required settings.
	if (!config.source && (!config.content && typeof config.content !== 'string')) {
		throw new Error('`source` or `content` is required.');
	}
	if (!config.bundlers || !(config.bundlers instanceof Array)) {
		throw new Error('`bundlers` is required and must be an Array.');
	}
}

/**
 *  Optionally load config file and normalize all config data.
 */
function normalizeConfig(config = {}) {
	// If config option is provided, load config file and merge it with config.
	if (config.config) {
		config.stak = config.stak || config.config.split(':')[1];
		config.config = config.config.split(':')[0];
		config = getConfigFile(config);
	}

	// Normalize config.
	if (typeof config.bundlers === 'string') {
		config.bundlers = config.bundlers.split(/,?\s+/);
	}
	if (!config.content) {
		config.content = '';
	}
	if (config.isProd === undefined) {
		config.isProd = process.env.NODE_ENV === 'prod' || process.env.NODE_ENV === 'production';
	}
	if (config.env === undefined) {
		config.env = process.env.NODE_ENV;
	}

	validateConfig(config);

	// Process source globs. Make sure it is iterable.
	if (
		(!config.content && globby.hasMagic(config.source)) ||
		(!config.content &&
			typeof config.source === 'string' &&
			fs.statSync(config.source).isDirectory())
	) {
		config.source = globby.sync(config.source, { dot: true });
	} else if (typeof config.source === 'string') {
		config.source = config.source.split(/,?\s+/);
	}

	// If output is a directory OR if it contains [name] or [ext], process source path files as separate staks. Otherwise process
	// source as a single stak.
	if (config.output) {
		config.stakEachFile =
			config.stakEachFile ||
			config.output.indexOf('[name]') > -1 ||
			isDirectory(config.output);
		// If we're bundling each file, make sure the output path's basename template is set.
		if (config.stakEachFile && config.output.indexOf('[name]') === -1) {
			config.output = path.join(config.output, '[name].[ext]');
		}
	}

	return config;
}

/**
 *  Check if filepath is a directory.
 */
function isDirectory(filepath) {
	// Return true of last character is '/'.
	if (filepath[filepath.length - 1] === '/') return true;
	// Otherwise check the path.
	const stats = fs.existsSync(filepath) && fs.statSync(filepath);
	if (stats && stats.isDirectory()) return true;
	return false;
}

/**
 *  Get config file with cosmiconfig.
 */
function getConfigFile(config = {}) {
	// Load config file with cosmiconfig.
	const cosmiconfig = require('cosmiconfig')('brikcss.stakcss', {
		rcExtensions: true,
		sync: true
	});
	let configFile = cosmiconfig.load(process.cwd(), config.config).config;
	// Grab the correct stak.
	if (config.stak) {
		configFile = configFile[config.stak];
	}
	// Merge config file with user config.
	config = merge({}, configFile, config);
	// Return the config.
	return config;
}

module.exports = stakcss;
