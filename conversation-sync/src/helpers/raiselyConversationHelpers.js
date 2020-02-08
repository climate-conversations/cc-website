const { raiselyRequest } = require('./raiselyHelpers');

/**
 * Return the first host and facilitator for a conversation
 * @param {string} conversationUuid The uuid of the conversation
 * @returns {object} { facilitator, host }
 */
async function fetchTeam(conversationUuid) {
	const rsvps = await raiselyRequest({
		path: `/events/${conversationUuid}/rsvps`,
		qs: {
			// FIXME need to know how to specify facilitator, host
		},
		token: process.env.RAISELY_TOKEN,
	});
	let host = rsvps.find(r => r.type === 'host');
	let facilitator = rsvps.find(r => r.type === 'facilitator');
	if (host) host = host.user;
	if (facilitator) facilitator = facilitator.user;
	return { host, facilitator };
}

module.exports = {
	fetchTeam,
}
