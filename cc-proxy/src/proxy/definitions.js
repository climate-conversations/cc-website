/**
 * This lists end points that may be escalated to higher privileges
 * The object values are
 * tags - A list of tags to be matched on the user to allow privilege escalation
 * roles - A list of roles to be matched on the user to allow privilege escalation
 * path - A path to map the request to if different than the original (string or regex)
 * condition - A function to use to additionally check before allowing a privilege escalation
 * transform - A function to use to transform the payload after it's returned and before sending on
 *
 * Endpoints that do not allow for privilege escalation are passed through to raisely
 * with the users own credentials (ie unescalated)
 */

const { minimalUser } = require('./transforms');
const { searchUsers, isUserAssignment, isAssignedUser } = require('./conditions');

module.exports = [{
	// Let facilitators retrieve the message templates stored on
	// campaign.private
	method: 'GET',
	path: /\/campaigns\/[a-zA-Z0-9_-]*/,
	tags: ['team-leader', 'facilitator'],
}, {
	// Let the public signup
	method: 'POST',
	path: '/interactions',
	// condition: onlyCertainCategories
},
// Let team leaders view interactions from any user
{
	method: 'GET',
	path: /\/interactions\/.*/,
	tags: ['team-leader'],
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
