module.exports = {
	one: {
		content: 'I am content from .stakcssrc-profiles.js:one',
		output: './.temp/one.md',
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
	},
	two: {
		content: 'I am content from .stakcssrc-profiles.js:two',
		output: './.temp/two.md',
		bundlers: [
			(config = {}) => {
				return new Promise((resolve) => {
					setTimeout(() => {
						config.testing = 'two';
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
