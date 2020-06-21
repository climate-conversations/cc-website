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
const { searchUsers, isUserAssignment, isAssignedUser, isConversationScoped } = require('./conditions');

// Actions that facils need escalation for but team leaders don't
const facilitatorEscalations = [
	// Allow facilitators to retrieve contact details for their team profile
	{ method: 'GET', path: /\/profiles\/[a-zA-Z0-9_-]*/, tags: ['facilitator'],	/* condition: isAssignedUser */ },
	// Allow facilitators to assign records they are already to
	{ method: 'POST', path: /\/users\/[a-zA-Z0-9_-]*\/assignments/, tags: ['facilitator'], /* condition: isAssignedUser */ },
	{ method: 'GET', path: '/search', tags: ['facilitator'], condition: searchUsers, transform: minimalUser },
	{ method: 'GET', path: /\/interactions\/.*/, tags: ['facilitator'], /* condition: isAssignedUser */ },
	{ method: 'POST', path: /\/interactions\/.*/, tags: ['facilitator'], /* condition: isAssignedUser */ },
];
// If someone is a team leader and a facil, set up rules that pass through using their
// permissions rather than escalating
const teamLeaderNonEscalations = facilitatorEscalations.map(rule => ({
	...rule,
	tags: ['team-leader'],
	noEscalate: true,
}))

module.exports = [
	// Let team leaders create facilitators
	{ method: 'POST', path: '/setupVolunteer/facilitator', tags: ['team-leader'] },
	// Let ORG_ADMINs create team leaders
	{ method: 'POST', path: '/setupVolunteer/team-leader', roles: ['ORG_ADMIN'] },
	// Let facilitators retrieve the message templates stored on
	// campaign.private
	{ method: 'GET', path: /\/campaigns\/[a-zA-Z0-9_-]*/, tags: ['team-leader', 'facilitator'] },
	// Let facils and leaders assign records
	{ method: 'POST', path: '/assignments', tags: ['team-leader', 'facilitator'] },

	/***** Let the public sign up for things ****** */
	// Let the public signup
	{ method: 'POST', path: '/interactions', /* condition: onlyCertainCategories */ },
	// Let the public RSVP
	{ method: 'POST', path: /\/events\/[a-zA-Z0-9_-]*\/rsvps/, /* condition: onlyCertainCategories */ },

	/***** Skip escalation for team leader actions ****** */
	{ method: 'GET', path: /\/interactions\/.*/, tags: ['team-leader'], noEscalate: true },
	{ method: 'POST', path: /\/users\/[a-zA-Z0-9_-]*\/assignments/,	tags: ['team-leader'], noEscalate: true },

	/** Facilitators */
	...teamLeaderNonEscalations,
	...facilitatorEscalations,

	// Manage donations
	{ method: 'POST', path: /\/donations/, tags: ['facilitator'] },
	{ method: 'GET', path: /\/donations.*/, tags: ['facilitator'], condition: isConversationScoped },
	{ method: 'GET', path: /\/donations.*/, tags: ['team-leader'], condition: isConversationScoped },

	/** Conversation management */
	{ method: 'POST', path: /\/events.*/, tags: ['facilitator', 'team-leader'] },
	{ method: 'PATCH', path: /\/events\/.*/, tags: ['facilitator', 'team-leader'] },
	{ method: 'PUT', path: /\/events\/.*/, tags: ['facilitator', 'team-leader'] },
	{ method: 'GET', path: /\/events.*/, tags: ['facilitator', 'team-leader'] },
	{ method: 'GET', path: /\/event_rsvps.*/, tags: ['facilitator', 'team-leader'] },
	{ method: 'POST', path: '/event_rsvps', tags: ['facilitator', 'team-leader'] },
	{ method: 'PUT', path: /\/event_rsvps\/.*/, tags: ['facilitator', 'team-leader'] },

	/** Upsert with self assign */
	{ method: 'POST', path: '/upsert/selfAssign', tags: ['facilitator', 'team-leader'] },
];
