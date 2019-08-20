class Request {
	constructor(options) {
		this.headers = {};
		Object.assign(this, options);
	}

	get(key) {
		return this.headers[key];
	}
}

module.exports = Request;
