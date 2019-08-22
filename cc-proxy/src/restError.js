const _ = require('lodash');

class RestError extends Error {
	constructor(options) {
		super(options.message);
		Object.assign(this, options);
	}
}

module.exports = RestError;
