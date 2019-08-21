const RestError = require('../restError');

const { minimalUser } = require('./transforms');
const { onlyUsers, isUserAssignment, isAssignedUser } = require('./conditions');

/**
 * This lists end points that may be escalated to higher privileges
 * The keys are of the form METHOD /path
 * The object values are
 * tags - A list of tags to be matched on the user to allow privilege escalation
 * roles - A list of roles to be matched on the user to allow privilege escalation
 * path - A path to map the request to if different than the original
 * condition - A function to use to additionally check before allowing a privilege escalation
 * transform - A function to use to transform the payload before sending
 *
 * Endpoints that do not allow for privilege escalation throw a 403
 */
const escalations = [{
// 	method: 'POST',
// 	path: '/users',
// 	transform: minimalUser,
// }, {
	// method: 'POST',
	// path: '/users',
	// tags: ['team-leader', 'facilitator'],
	method: 'POST',
	path: '/interactions',
	// condition: onlyCertainCategories
}, {
	method: 'POST',
	path: '/users/:user/assignments',
	tags: ['team-leader'],
	// Only allow team-leaders to assign users (not other record types)
	condition: isUserAssignment,
}, {
	method: 'POST',
	path: '/users/:user/assignments',
	tags: ['facilitator'],
	// Only allow facilitators to assign records they are already
	// themselves assigned to
	condition: isAssignedUser,
}, {
	method: 'POST',
	path: '/events/:event/eventRsvp',
	tags: ['facilitator', 'team-leader'],
}, {
	method: 'GET',
	// path: '/search',
	tags: ['facilitator', 'team-leader'],
	// Only allow search for user records
	condition: onlyUsers,
	// Transform the results to be the minimum attributes needed on the users
	transform: minimalUser,
}];

function authorize(req, path) {
	const escalation = escalations.find(e => e.path === path && e.method === req.method);

	if (!escalation) {
		throw new RestError({
			path,
			status: 403,
			message: 'You are not authorized to make that request',
			code: 'unauthorized',
		});
	}

	return escalation;
}

module.exports = {
	escalations,
	authorize,
};
