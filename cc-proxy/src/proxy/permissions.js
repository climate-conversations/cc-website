const _ = require('lodash');
const RestError = require('../restError');
const raiselyRequest = require('../raiselyRequest');

const AUTHENTICATION_TTL = 10 * 60 * 1000;

const escalations = require('./definitions');

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
		user: _.get(user, 'data'),
	};
}

function matchPath(e, path) {
	if (e.path && e.path.test) {
		const result = e.path.test(path);
		e.lastIndex = 0;
		return result;
	}
	return e.path === path;
}

async function authorize(req, path) {
	const { user, tags, roles } = await getTagsAndRoles(req);

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

	return {
		...escalation,
		originalUser: user && {
			uuid: user.uuid,
			tags,
			roles,
		}
	};
}

module.exports = {
	escalations,
	authorize,
};
