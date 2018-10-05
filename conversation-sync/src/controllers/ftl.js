const airtables = require('../services/airtables');

async function syncGuestToFtl(data) {
	const facilitator = await airtables.upsert('Facilitators', { Email: data.facilitatoremailaddress }, {
		Email: data.facilitatoremailaddress,
		Name: data.facilitatorname,
		Status: 'Emerging',
	});
	const host = await airtables.upsert('Hosts', { Email: data.hostemailaddress }, {
		Email: data.hostemailaddress,
		Name: data.hostname,
		'Facilitator responsible': [facilitator.id],
	});

	const conversationId = `${data.conversationdate} ${host.fields.id}`;
	const conversation = await airtables.upsert('Conversations', { Name: conversationId }, {
		Facilitator: { method: 'add', record: facilitator.id },
		Host: [host.id],
		Date: data.conversationdate,
	});

	const promises = [];

	/* eslint-disable quote-props */
	const guestId = `{Id}='${data.participantname} - ${data.conversationDate}'`;
	promises.push(airtables.upsert('Guests', { id: guestId }, {
		'Facilitator Email Address': data.facilitatoremailaddress,
		'Facilitator Name': data.facilitatorname,
		'Host Email Address': data.hostemailaddress,
		'Host Name': data.hostname,
		'Will you take action': data.willyoubetakinganyactionasaresultoftodayssession,
		'[Host]': data.host,
		'[Facilitate]': data.facilitate,
		'[Volunteer]': data.volunteer,
		'Cash Donation': data.cashdonationamountnotcreditcards,
		'Name': data.participantname,
		'Email': data.participantemail,
		'Timestamp': data.timestamp,
		'Date of Conversation': data.conversationdate,
		'Phone': data.participantmobile,
		'Conversation': [conversation.id],
	}));
	/* eslint-enable quote-props */

	if (data.facilitate && (data.facilitate !== '')) {
		promises.push(airtables.upsert('Facilitators', { Email: data.participantemail }, {
			Email: data.participantemail,
			Name: data.participantname,
			Status: 'Emerging',
			Team: facilitator.fields.Team,
			Phone: data.participantmobile,
			Mentor: [facilitator.id],
			'Added On': data.conversationdate,
			'Recruited At': [conversation.id],
		}));
	}

	if (data.facilitate && (data.facilitate !== '')) {
		promises.push(airtables.upsert('Hosts', { Email: data.participantemail }, {
			Email: data.participantemail,
			Name: data.participantname,
			Phone: data.participantmobile,
			'Facilitator responsible': [facilitator.id],
			'Recruited At': [conversation.id],
			'Added On': data.conversationdate,
		}));
	}

	return Promise.all(promises);
}

module.exports = { syncGuestToFtl };
