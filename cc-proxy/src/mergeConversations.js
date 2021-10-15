const _ = require('lodash');
const RestError = require('./restError');
const { authorize } = require('./proxy/permissions');
const raisely = require('./raiselyRequest');

/**
 * Count the number of attendees, defined as hosts, co-hosts and guests
 * removes duplicates (eg if someone were a host of one conversation
 * and then a guest)
 * @param {*} rsvps
 * @returns {integer}
 */
function countAttendees(rsvps) {
	const attendeeTypes = ['host', 'co-host', 'guest'];
	const allAttendees = rsvps
		.filter((r) => attendeeTypes.includes(r.type))
		.map((r) => r.userUuid);
	const uniqueAttendees = _.uniq(allAttendees);
	return uniqueAttendees.length;
}

// compares both conversations
// returns Uuid with more RSVPs
async function mostRSVPs(conversationUuid1, conversationUuid2) {
	let conversation1RSVP = await raisely(
		{
			method: 'GET',
			path: `/events/${conversationUuid1}/rsvps?private=1`,
			escalate: true,
		},
		req
	);
	let conversation2RSVP = await raisely(
		{
			method: 'GET',
			path: `/events/${conversationUuid2}/rsvps?private=1`,
			escalate: true,
		},
		req
	);

	let conversation1AttendeesCount = countAttendees(conversation1RSVP.data);
	let conversation2AttendeesCount = countAttendees(conversation2RSVP.data);

	return conversation1AttendeesCount >= conversation2AttendeesCount
		? conversationUuid1
		: conversationUuid2;
}

async function mergeConversations(req) {
	let { conversationUuid1, conversationUuid2 } = req.body.data;

	const isAuthorized = await authorize(req, `/mergeConversations`);

	if (!isAuthorized) {
		throw new Error('You are not authorized to do that');
	}

	let conversation1Data = await raisely(
		{
			method: 'GET',
			path: `/events/${conversationUuid1}?private=1`,
			escalate: true,
		},
		req
	);

	let conversation2Data = await raisely(
		{
			method: 'GET',
			path: `/events/${conversationUuid2}?private=1`,
			escalate: true,
		},
		req
	);

	// Sanity check: should reject merge if conversation1Data.name !== conversation2Data.name
	if (conversation1Data.data.name !== conversation2Data.data.name) {
		console.error('Both conversations have the same name!');
	}

	// select which uuid to keep. Keep the uuid with the most RSVPs
	const uuidToKeep = await mostRSVPs(conversationUuid1, conversationUuid2);

	let conversationToKeep =
		conversation1Data.data.uuid == uuidToKeep
			? conversation1Data
			: conversation2Data;
	let conversationToDelete =
		conversation1Data.data.uuid !== uuidToKeep
			? conversation2Data
			: conversation1Data;

	// go through all the keys in the conversation to keep the
	// and merge them into the selected conversation
	// note that some fields only appear after they are completed (eg cash donations)
	// (at key, if it has values, keep the field.
	// if not, check the difference, which field to keep

	for (let [key, value] of Object.entries(conversationToKeep)) {
		if (value) {
			return;
		} else {
			// not too sure about this step
			conversationToKeep.value = conversationToDelete.value;
		}
	}

	// point interactions to the right uuid
	// here returns a 500 error
	// let interactions = await raisely({
	// 	method: 'GET',
	// 	path: `/interactions`,
	// 	query: {
	// 		private: 1,
	// 		user: conversation1Data.userUuid,
	// 		['detail.private.conversationUuid']: conversationUuid1,
	// 	},
	// });

	// update the conversation to keep
	// await raisely(
	// 	{
	// 		method: 'PATCH',
	// 		path: `/events/${uuidToKeep}?private=1`,
	// 		escalate: true,
	// 		body: conversationToKeep
	// 	},
	// 	req
	// );

	// delete conversation that we dont want
	// await raisely(
	// 	{
	// 		method: 'DELETE',
	// 		path: `/events/${conversationToDelete.data.uuid}?private=1`,
	// 		escalate: true,
	// 	},
	// 	req
	// );

	return {
		data: 'data',
	};
}

module.exports = { mergeConversations };
