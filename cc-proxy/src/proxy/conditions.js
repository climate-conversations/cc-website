const _ = require('lodash');
const qs = require('qs');
const RestError = require('../restError');

function parsePath(url) {
	const split = url.indexOf('?');
	const path = split === -1 ? url : url.slice(0, split);
	const query = split === -1 ? '' : url.slice(split + 1, url.length);

	return { path, query };
}

function getQuery(url) {
	const { path, query } = parsePath(url);
	return qs.parse(query);
}

function notImplemented() {
	throw new Error('Not implemented');
}

function isUserAssignment(req) {
	const assignments = _.get(req, 'body.data');
	if (!Array.isArray(assignments)) {
		throw new RestError({
			status: 400,
			code: 'malformed',
			message: 'Assignments request with bad body.data',
		});
	}
	return assignments.reduce((all, curr) => all && curr.recordType === 'user', true);
}

function isConversationScoped(req) {
	const query = getQuery(req.originalUrl);
	return !!query.conversationUuid;
}

module.exports = {
	onlyUsers: notImplemented,
	isUserAssignment,
	isAssignedUser: notImplemented,
	isConversationScoped,
};
