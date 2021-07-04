class Request {
	constructor(options) {
		this.headers = {};
		Object.assign(this, options);
		this.originalUrl = this.url;
	}

	get(key) {
		return this.headers[key];
	}
}

module.exports = Request;
