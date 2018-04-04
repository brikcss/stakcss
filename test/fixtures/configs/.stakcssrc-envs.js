const profiles = {
	one: {
		content: 'I am content from .stakcssrc-envs.js:' + process.env.NODE_ENV,
		output: './.temp/one.js',
		bundlers: [
			(config = {}) => {
				return new Promise((resolve) => {
					setTimeout(() => {
						config.testing = 'one';
						config.array = [1];
						resolve(config);
					}, 20);
				});
			},
			(config = {}) => {
				config.array.push(2);
				return config;
			}
		]
	}
};

if (process.env.NODE_ENV === 'production') {
	profiles.one_min = Object.assign({}, profiles.one);
	profiles.one_min.content += ':minified';
	profiles.one_min.output = profiles.one_min.output.replace('.js', '.min.js');
}

module.exports = profiles;
