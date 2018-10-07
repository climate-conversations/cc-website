const kepla = require('../services/kepla');
const { isoDateToKeplaDate, dateKeys } = require('./helpers/dateHelpers');

async function syncGuestToKepla(data) {
	// Clone the data
	// eslint-disable-next-line no-param-reassign
	data = Object.assign({}, data);

	dateKeys.forEach((key) => { data[key] = data[key] ? isoDateToKeplaDate(data[key]) : null; });
	data.residentialstatus = kepla.mapToKeplaResidency(data.residentialstatus);

	/* eslint-disable quote-props */
	const [host, facilitator, guest, facilUser] = await Promise.all([
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
		}),
		kepla.findUser(data.facilitatoremailaddress),
	]);
	/* eslint-enable quote-props */

	const conversationDetails = { host, facilitator, status: 'Completed' };
	conversationDetails.date = data.conversationdate;
	const conversation = await kepla.upsertConversation(conversationDetails);

	// Assign facilitator to records
	return Promise.all([
		kepla.assignUserToRecord(facilUser, guest, 'person'),
		kepla.assignUserToRecord(facilUser, conversation, 'conversation'),
		kepla.addRelationship(conversation, guest, 'attendee'),
	]);
}

module.exports = { syncGuestToKepla };
