const { authorize } = require('./permissions');
const raisely = require('../raiselyRequest');

module.exports = async function proxy(req) {
	const [path] = req.originalUrl.split('?');

	const rule = await authorize(req, path);

	const options = {
		path: req.originalUrl,
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
