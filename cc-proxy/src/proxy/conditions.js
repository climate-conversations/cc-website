function notImplemented() {
	throw new Error('Not implemented');
}

module.exports = {
	onlyUsers: notImplemented,
	isUserAssignment: notImplemented,
	isAssignedUser: notImplemented,
};
