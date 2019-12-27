const _ = require('lodash');
const RestError = require('../restError');
const raiselyRequest = require('../raiselyRequest');

const { minimalUser } = require('./transforms');
const { searchUsers, isUserAssignment, isAssignedUser } = require('./conditions');
const AUTHENTICATION_TTL = 10 * 60 * 1000;

/**
 * This lists end points that may be escalated to higher privileges
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
	// Let facilitators retrieve the message templates stored on
	// campaign.private
	method: 'GET',
	path: /\/campaigns\/[a-zA-Z0-9_-]*/,
	tags: ['team-leader', 'facilitator'],
}, {
	// method: 'POST',
	// path: '/users',
	// tags: ['team-leader', 'facilitator'],
	method: 'POST',
	path: '/interactions',
	// condition: onlyCertainCategories
}, {
	method: 'POST',
	path: /\/users\/[a-zA-Z0-9_-]*\/assignments/,
	tags: ['team-leader'],
	// Only allow team-leaders to assign users (not other record types)
	condition: isUserAssignment,
}, {
	method: 'POST',
	path: /\/users\/[a-zA-Z0-9_-]*\/assignments/,
	tags: ['facilitator'],
	// Only allow facilitators to assign records they are already
	// themselves assigned to
	condition: isAssignedUser,
}, {
	method: 'POST',
	path: /\/events\/[a-zA-Z0-9_-]*\/eventRsvp/,
	tags: ['facilitator', 'team-leader'],
}, {
	method: 'GET',
	// path: '/search',
	tags: ['facilitator', 'team-leader'],
	// Only allow search for user records
	condition: searchUsers,
	// Transform the results to be the minimum attributes needed on the users
	transform: minimalUser,
}];

/**
 * Get a users roles and tags for use in authentication
 * @param {} req
 */
async function getTagsAndRoles(req) {
	const bearer = req.get('Authorization');
	if (!bearer) return { tags: [], roles: [] };

	const [prefix, token] = bearer.split(' ');
	if (((prefix || '').toLowerCase() !== 'bearer') || !token) {
		throw new RestError({
			status: 400,
			message: 'Authentication header is malformed',
			code: 'malformed',
		});
	}

	const opt = { cacheTTL: AUTHENTICATION_TTL };
	const [authentication, user] = await Promise.all([
		raiselyRequest({ ...opt, cacheKey: `/authenticate ${token}`, path: '/authenticate', token }, req),
		raiselyRequest({ ...opt, cacheKey: `/users/me ${token}`, path: '/users/me?private=1', token }, req),
	]);

	return {
		tags: _.get(user, 'data.tags', []).map(t => t.path),
		roles: _.get(authentication, 'data.roles', []),
	};
}

function matchPath(e, path) {
	if (e.path.test) {
		const result = e.path.test(path);
		e.lastIndex = 0;
		return result;
	}
	return e.path === path;
}

async function authorize(req, path) {
	const { tags, roles } = await getTagsAndRoles(req);

	const escalation = escalations.find((e) => {
		let isMatch = e.method.toLowerCase() === req.method.toLowerCase() && matchPath(e, path);
		if (e.tags) isMatch = isMatch && _.intersection(e.tags, tags).length;
		if (e.roles) isMatch = isMatch && _.intersection(e.roles, roles).length;
		return isMatch;
	});

	let deny = false;
	if (_.get(escalation, 'condition')) {
		deny = !await escalation.condition(req);
	}

	// Return false and pass through request
	if (!escalation || deny) {
		return false;
	}

	return escalation;
}

module.exports = {
	escalations,
	authorize,
};
