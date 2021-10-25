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
async function mostRSVPs(conversationUuid1, conversationUuid2, req) {
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

	console.log('getting conversation data');
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
	// console.log('conversation 1 data: ', conversation1Data);

	// Sanity check: should reject merge if conversation1Data.name !== conversation2Data.name
	// if (conversation1Data.data.name !== conversation2Data.data.name) {
	// 	console.error('Both conversations have the same name!');
	// }

	console.log('checking which uuid has the most rvsps');
	// select which uuid to keep. Keep the uuid with the most RSVPs
	const uuidToKeep = await mostRSVPs(
		conversationUuid1,
		conversationUuid2,
		req
	);

	console.log('most rsvps: ', uuidToKeep);
	let conversationToKeep =
		conversation1Data.data.uuid == uuidToKeep
			? conversation1Data
			: conversation2Data;
	let conversationToDelete =
		conversation1Data.data.uuid !== uuidToKeep
			? conversation1Data
			: conversation2Data;

	// go through all the keys in the conversation to keep the
	// and merge them into the selected conversation
	for (let [key, value] of Object.entries(conversationToDelete.data)) {
		if (key === 'private') {
			conversationToKeep.data.private = {
				...(conversationToDelete.data.private || {}),
				...(conversationToKeep.data.private || {}),
			};
		}

		if (key === 'public') {
			conversationToKeep.data.public = {
				...(conversationToDelete.data.private || {}),
				...(conversationToKeep.data.public || {}),
			};
		}

		if (value) {
			continue;
		} else {
			conversationToKeep.data[key] = value;
		}
	}

	// point interactions to the right uuid
	// here returns a 500 error
	console.log('getting interactions');
	let interactions = await raisely({
		method: 'GET',
		path: `/interactions`,
		query: {
			private: 1,
			user: conversation1Data.userUuid,
			['detail.private.conversationUuid']: conversationUuid1,
		},
	});

	console.log(interactions);
	// move RSVPs

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
