module.exports = (config = {}, compiler = {}) => {
	config.success.push(compiler.options.two);
	return config;
};
