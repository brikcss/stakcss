/** ------------------------------------------------------------------------------------------------
 *  @filename  stakcss.js
 *  @author  brikcss  <https://github.com/brikcss>
 *  @description  Stakcss takes a collection of files or data, runs them through a series of
 *      bundlers (not included), and outputs bundled data, optionally saved to disk.
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
	config._timerId = Object.keys(timer.all).length;
	timer.start(config._timerId);
	return new Promise((resolve) => resolve(createConfigProfiles(config)))
		.then((configResult) => {
			const promises = [];
			configResult.profiles.forEach((profile) => promises.push(runProfile(profile)));
			return Promise.all(promises);
		})
		.then((results) => {
			timer.stop(config._timerId);
			if (!config.hasWatcher) {
				log.warn(`[ok] Completed all bundles (${timer.duration(config._timerId)}).`);
			}
			timer.clear(config._timerId);
			if (results.length === 1) {
				return results[0];
			}
			return results;
		})
		.catch((error) => logError(error, config));
}

/**
 *  Run a profile. Iterates through each stak in a profile and returns a promise for each.
 */
function runProfile(config = {}) {
	const bundlePromises = [];
	timer.start('profile-' + config.id);
	if (!config.hasWatcher) {
		log.info(`Running profile \`${config.id}\`...`);
	}
	if (config.stakEachFile) {
		config.source.forEach((filepath) => {
			let output = config.output;
			// Determine output path based on `root`.
			if (config.stakEachFile) {
				// Set full output path, replacing template placeholders.
				output = path
					.join(
						path.dirname(config.output),
						config.root ? path.relative(config.root, path.dirname(filepath)) : '',
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
				bundleStak(
					Object.assign({}, config, {
						source: filepath,
						output
					})
				)
			);
		});
	} else {
		bundlePromises.push(bundleStak(config));
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
			logError('[!!] Uh oh... no results were returned.', config, true);
		} else if (!results[results.length - 1].content) {
			log.error(
				`[!!] No content was returned from profile \`${
					config.id
				}\`. Make sure source paths are correct.`
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
				.on('change', () => {
					config.content = '';
					log.warn(`Running profile \`${config.id}\`...`);
					return runProfile(config);
				})
				.on('error', (error) => logError(error, config))
				.on('ready', () => {
					config.hasWatcher = true;
					log.error(`Watching profile \`${config.id}\`...`);
					return config.watcher;
				});
		}
		// Return the result object.
		timer.stop('profile-' + config.id);
		if (!config.hasWatcher && config.profiles && config.profiles.length > 1) {
			log.warn(
				`Completed profile \`${config.id}\` (${timer.duration('profile-' + config.id)}).`
			);
		}
		timer.clear('profile-' + config.id);
		return result;
	});
}

/**
 *  Runs a single stak. Passes config to each bundler and then outputs the result. See
 *  https://stackoverflow.com/questions/24660096/correct-way-to-write-loops-for-promise#answer-24985483
 *  for a solid method of looping through promises.
 */
function bundleStak(config = {}) {
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
						// If bundler is a relative path, require it.
						bundler.run = requireBundler(bundler.run, config.cwd);
					}
					if (typeof bundler.run !== 'function') {
						logError(
							`bundler is not a function or can not be resolved. ${bundler.run}`,
							config,
							true
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
 *  Create an Array of config profiles from user config.
 */
function createConfigProfiles(userConfig = {}) {
	// Create config object with original user config and Array of config profiles.
	const config = {
		user: userConfig,
		profiles: []
	};

	// Merge config file with user config and convert user config into array of config profiles.
	if (userConfig.config) {
		if (typeof userConfig.config === 'string') {
			userConfig.profiles = userConfig.profiles || userConfig.config.split(':')[1];
			userConfig.config = userConfig.config.split(':')[0];
		}
		let configFile = getConfigFile(userConfig);

		// Split config into Array of configs for each profile.
		if (userConfig.profiles) {
			if (userConfig.profiles === 'all') {
				userConfig.profiles = Object.keys(configFile);
			} else if (typeof userConfig.profiles === 'string') {
				userConfig.profiles = userConfig.profiles.split(',');
			}
			userConfig.profiles.forEach((profile, i) => {
				config.profiles.push(
					merge({}, configFile[profile], userConfig, {
						id: configFile[profile].id || profile || i
					})
				);
			});
		} else {
			config.profiles.push(merge(userConfig, configFile));
		}
	} else if (userConfig instanceof Array) {
		config.profiles = userConfig;
	} else {
		config.profiles.push(userConfig);
	}

	// Normalize and validate each config profile.
	config.profiles.forEach((profile, i) => {
		if (config.profiles[i].id === undefined) {
			config.profiles[i].id = i;
		}
		config.profiles[i] = normalizeConfig(profile);
		validateConfig(profile);
	});

	return config;
}

/**
 *  Get config file with cosmiconfig.
 */
function getConfigFile(config = {}) {
	// Load config file with cosmiconfig.
	const cosmiconfig = require('cosmiconfig')('stakcss', {
		rcExtensions: true,
		sync: true
	});
	// Return the config.
	return cosmiconfig.load(config.cwd, typeof config.config === 'string' ? config.config : null)
		.config;
}

/**
 *  Normalize a configuration profile.
 */
function normalizeConfig(config = {}) {
	// Normalize cwd.
	config.cwd = config.cwd || process.cwd();

	// Normalize bundlers and content.
	if (typeof config.bundlers === 'string') {
		config.bundlers = config.bundlers.split(/,?\s+/);
	}
	if (!config.content) {
		config.content = '';
	}

	// Process source globs. Make sure source is iterable.
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

	// Return normalized config profile.
	return config;
}

/**
 *  Validates config object. This should be run after each bundler to ensure it returns a valid
 *  config object.
 */
function validateConfig(config = {}) {
	// Validate required settings.
	if (!config.source && (!config.content && typeof config.content !== 'string')) {
		logError('`source` or `content` is required.', config, true);
	}
	if (!config.bundlers || !(config.bundlers instanceof Array)) {
		logError('`bundlers` is required and must be an Array.', config, true);
	}
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
 *  Log error.
 */
function logError(error, config = {}, throwError) {
	timer.clear(config._timerId);
	if (throwError) {
		throw new Error(error);
	} else {
		log.error(`[${config.id}]`, error);
	}
	return error;
}

function requireBundler(bundlerPath, cwd) {
	// If it's a relative path, require it.
	if (bundlerPath.indexOf('./') === 0 || bundlerPath.indexOf('../') === 0) {
		return require(path.resolve(cwd, bundlerPath));
	}
	// Check first for module name prefixed with `stakcss-bundler-`.
	if (bundlerPath.indexOf('stakcss-bundler-') === -1) {
		let stakcssBundlerPath = bundlerPath.split('/');
		stakcssBundlerPath.splice(-1, 0, 'stakcss-bundler-');
		if (stakcssBundlerPath.length > 2) {
			stakcssBundlerPath.splice(1, 0, '/');
		}
		stakcssBundlerPath = stakcssBundlerPath.join('');
		if (require.resolve(stakcssBundlerPath)) {
			return require(stakcssBundlerPath);
		}
	}
	// Check for module at exact path provided.
	return require(bundlerPath);
}

module.exports = stakcss;
