const _ = require('lodash');

class RestError extends Error {
	constructor(options) {
		super(options.message);
		Object.assign(this, _.pick(options, ['code', 'status']));
	}
}

module.exports = RestError;
