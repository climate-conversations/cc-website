const { authorize } = require('./permissions');
const raisely = require('../raiselyRequest');

module.exports = function proxy(req) {
	// TODO Authenticate user
	// TODO Load user tags
	const baseUrl = '/proxy';
	const path = req.originalUrl.substr(baseUrl.length);

	const rule = authorize(req, path);

	const options = {
		path,
		query: req.query,
		body: req.body,
		method: req.method,
	};

	if (rule.transform) {
		options.transform = rule.transform;
		options.transform2xxOnly = true;
	}

	return raisely(options, req);
};
