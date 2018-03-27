const fs = require('fs-extra');

module.exports = (config = {}) => {
	return new Promise((resolve) => {
		(config.source instanceof Array ? config.source : [config.source]).forEach((filepath) => {
			config.content += fs.readFileSync(filepath, 'utf8');
		});
		resolve(config);
	});
};
