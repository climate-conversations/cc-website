const _ = require('lodash');
const { authorize } = require('./permissions');
const raisely = require('../raiselyRequest');

function printArray(source, path) {
	return _.get(source, path, []).join(',');
}

module.exports = async function proxy(req, res) {
	const [path] = req.originalUrl.split('?');

	const rule = await authorize(req, path);

	const escalate = !!rule && !rule.noEscalate;
	const options = {
		path: req.originalUrl,
		query: req.query,
		body: req.body,
		method: req.method,
		// Explicitly request escalation if there's a
		// matching rule and it doesn't suggest no escalation
		escalate,
	};

	res.set('X-CC-Proxy-Escalate', escalate ? 'Yes' : 'No');
	res.set('X-CC-Proxy-Roles', escalate ? 'ORG_ADMIN' : printArray(rule, 'originalUser.roles'))
	res.set('X-CC-Rule-Matched-On', `${printArray(rule, 'tags')} ${printArray(rule, 'roles')}`);

	if (rule && rule.transform) {
		options.transform = rule.transform;
		options.transform2xxOnly = true;
	}

	return raisely(options, req);
};
