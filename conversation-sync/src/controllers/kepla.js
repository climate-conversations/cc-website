const kepla = require('../services/kepla');
const { isoDateToKeplaDate, dateKeys } = require('./helpers/dateHelpers');

async function syncGuestToKepla(data) {
	// Clone the data
	// eslint-disable-next-line no-param-reassign
	data = Object.assign({}, data);

	dateKeys.forEach((key) => { data[key] = data[key] ? isoDateToKeplaDate(data[key]) : null; });
	data.residentialstatus = kepla.mapToKeplaResidency(data.residentialstatus);

	if (!data.participantemail) {
		console.log(`KEPLA: no email for ${data.participantname}, skipping`);
		return null;
	}

	console.log(`KEPLA: Upserting ${data.hostname} (host), ${data.facilitatorname} (facil), ${data.participantname} (guest)`)
	/* eslint-disable quote-props */
	// eslint-disable-next-line prefer-const
	let [host, facilitator, guest, facilUser] = await Promise.all([
		kepla.upsertPerson(data.hostemailaddress, {
			'Email': data.hostemailaddress,
			'Full Name': data.hostname,
		}),
		kepla.upsertPerson(data.facilitatoremailaddress, {
			'Email': data.facilitatoremailaddress,
			'Full Name': data.facilitatorname,
		}),
		kepla.upsertPerson(data.participantemail, {
			'Email': data.participantemail,
			'Full Name': data.participantname,
			'Mobile Phone': data.participantmobile,
			'Date of Birth': data.dateofbirth,
			'Residency': data.residentialstatus,
			'Post Code': data.participantpostcode,
			'Country': 'Singapore',
			'Host': data.host,
			'Facilitate': data.facilitate,
			'Volunteer': data.volunteer,
			'Take 2 hours with friends': data.give2hourstoclimateactionwfriends,
		}, ['Email', 'Mobile Phone']),
		kepla.findUser(data.facilitatoremailaddress),
	]);
	/* eslint-enable quote-props */

	const conversationDetails = { host, facilitator, status: 'Completed' };
	conversationDetails.date = data.conversationdate;
	let conversation = await kepla.upsertConversation(conversationDetails);

	[conversation, guest] = await Promise.all([
		kepla.getRecord(conversation), kepla.getRecord(guest),
	]);

	const promises = [
		kepla.addRelationship(conversation, guest, 'attendee'),
	];

	if (facilUser) {
		promises.concat([
			kepla.assignUserToRecord(facilUser, guest, 'person'),
			kepla.assignUserToRecord(facilUser, conversation, 'conversation'),
		]);
	} else {
		console.log(`WARNING: No facilitator user found for ${data.facilitatorname} records are unassigned`);
	}

	// Assign facilitator to records
	return Promise.all(promises);
}

module.exports = { syncGuestToKepla };
