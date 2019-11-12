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

module.exports = {
	onlyUsers: notImplemented,
	isUserAssignment,
	isAssignedUser: notImplemented,
};
