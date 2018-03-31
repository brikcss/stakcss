module.exports = {
	content: 'I am content from .stakcssrc.js',
	output: './.temp/test.md',
	bundlers: [
		(config = {}) => {
			return new Promise((resolve) => {
				setTimeout(() => {
					config.testing = 'test';
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
};
