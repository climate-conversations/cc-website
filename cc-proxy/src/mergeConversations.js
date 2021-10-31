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

// find uique object in array based on multiple properties
function unique(arr, keyProps) {
	const kvArray = arr.map((entry) => {
		const key = keyProps.map((k) => entry[k]).join('|');
		return [key, entry];
	});
	const map = new Map(kvArray);
	return Array.from(map.values());
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
				...(conversationToKeep.data.private || {}), // keep conversationToKeep to keep if key exists for both conversations
			};
		} else if (key === 'public') {
			conversationToKeep.data.public = {
				...(conversationToDelete.data.private || {}),
				...(conversationToKeep.data.public || {}),
			};
		} else {
			// i want to merge only if conversationToDelete contains values
			// and conversationToKeep doesnt contain values
			if (
				conversationToDelete.data[key] &&
				!conversationToKeep.data[key]
			) {
				conversationToKeep.data[key] = value;
			}
		}
	}

	// point interactions to the right uuid
	console.log('getting interactions');

	// interaction to delete is the source
	// interactions to merge is the target
	let targetInteractions = await raisely(
		{
			method: 'GET',
			path: `/interactions`,
			query: {
				private: 1,
				['detail.private.conversationUuid']:
					conversationToKeep.data.uuid,
			},
		},
		req
	);

	let sourceInteractions = await raisely(
		{
			method: 'GET',
			path: `/interactions`,
			query: {
				private: 1,
				['private.conversationUuid']: conversationToDelete.data.uuid, // this filter not working
			},
		},
		req
	);

	// filter out built in interactions (how?)
	// get pairs of user and categories
	let targetPairs = targetInteractions.data.map(
		({ userUuid, categoryUuid }) => {
			return { userUuid, categoryUuid };
		}
	);

	let sourcePairs = sourceInteractions.data.map(
		({ userUuid, categoryUuid }) => {
			return { userUuid, categoryUuid };
		}
	);

	let targetPairsUnique = unique(targetPairs, ['userUuid', 'categoryUuid']);
	let sourcePairsUnique = unique(sourcePairs, ['userUuid', 'categoryUuid']);
	console.log(targetPairsUnique.slice(0, 3));
	// *** there 2 types of interactions
	// delete the rest the interactions at the source

	// 1. if exist on both source and target ->  need to merge (patch request)
	// get overlapping pairs
	let overlappingPairs = sourcePairsUnique.filter((sourcePair) =>
		targetPairsUnique.some(
			(targetPair) =>
				targetPair.userUuid === sourcePair.userUuid &&
				targetPair.categoryUuid === sourcePair.categoryUuid
		)
	);

	// get interactions from source Interactions that contain the overlapping pairs
	let interactionsToMerge;
	if (overlappingPairs) {
		interactionsToMerge = overlappingPairs.map((overlappingPair) => {
			return sourceInteractions.data.filter((interaction) => {
				return (
					interaction.userUuid === overlappingPair.userUuid &&
					interaction.categoryUuid === overlappingPair.categoryUuid
				);
			});
		});
	}

	// 2. if they exist in the source but not the target, then we need to create the interactions at the target

	var missingPairs = sourcePairs.filter((sourcePair) => {
		return !targetPairs.some((targetPair) => {
			return (
				sourcePair.userUuid === targetPair.userUuid &&
				sourcePair.categoryUuid === targetPair.categoryUuid
			);
		});
	});

	// console.log(missingPairs);

	// sourceInteractions.data.slice(0, 1);
	// get interactions to create at the target from the source
	let interactionsToCreate = [];
	if (missingPairs) {
		interactionsToCreate = missingPairs.map((missingPair) => {
			return sourceInteractions.data.filter((interaction) => {
				return (
					interaction.userUuid === missingPair.userUuid &&
					interaction.categoryUuid === missingPair.categoryUuid
				);
			});
		});
	}

	// merge interactionsToMerge to targetInteractions uuid
	// use interactionId

	// if (interactionstoMerge) {
	// 	interactionsToMerge.forEach(interaction => {
	// 		await raisely(
	// 			{
	// 				method: 'PATCH',
	// 				path: `/interactions/${interaction.uuid}`,
	// 				// insert body here
	// 			},
	// 			req

	// 		)
	// 	})
	// }

	// create missing interaction at targetInteractions uuid
	// if (interactionsToCreate) {
	// 	interactionsToCreate.forEach(obj => {
	// 		await raisely(
	// 				{
	// 					method: 'POST',
	// 					path: `/interactions/{interaction.uuid}`,
	// 				},
	// 				req
	// 			);
	// 	})
	// }

	// delete all the source interactions
	// sourceInteractions.data.forEach(interaction => {
	// 		await raisely(
	// 		{
	// 			method: 'DELETE',
	// 			path: `/interactions/${interaction.uuid}`,

	// 		},
	// 		req
	// 	);
	// })


	// check which rsvps to move?
	// only if the rsvps doesnt exist in the conversationToKeep
	// move RSVPs to conversationToKeep
	// const moveRsvps = await raisely(
	// 	{
	// 		method: 'PUT',
	// 		path: `/event_rsvps/rsvp.uuid/move`, // should be rsvp uuid
	// 		data: {
	// 			eventUuid: conversationToDelete.data.uuid, //
	// 		},
	// 	},
	// 	req
	// );

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
