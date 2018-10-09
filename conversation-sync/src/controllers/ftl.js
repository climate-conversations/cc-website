const airtables = require('../services/airtables');

async function syncGuestToFtl(data) {
	console.log(`Airtables: upserting facilitator ${data.facilitatorname}`);
	const facilitator = await airtables.upsert('Facilitators', { Email: data.facilitatoremailaddress }, {
		Email: data.facilitatoremailaddress,
		Name: data.facilitatorname,
		Status: 'Emerging',
	});
	console.log(`Airtables: upserting host ${data.hostname}`);
	const host = await airtables.upsert('Hosts', { Email: data.hostemailaddress }, {
		Email: data.hostemailaddress,
		Name: data.hostname,
		'Facilitator responsible': [facilitator.id],
	});

	const conversationId = `${data.conversationdate} ${host.fields.id}`;
	console.log(`Airtables: upserting conversation ${conversationId}`);
	const conversation = await airtables.upsert('Conversations', { Name: conversationId }, {
		Facilitator: { method: 'add', record: facilitator.id },
		Host: [host.id],
		Date: data.conversationdate,
	});

	const promises = [];

	/* eslint-disable quote-props */
	console.log(`Airtables: upserting guest ${data.participantname}`);
	const guestId = `${data.participantname} - ${data.conversationdate}`;
	promises.push(airtables.upsert('Guests', { Id: guestId }, {
		'Facilitator Email Address': data.facilitatoremailaddress,
		'Facilitator Name': data.facilitatorname,
		'Host Email Address': data.hostemailaddress,
		'Host Name': data.hostname,
		'Will you take action': data.willyoubetakinganyactionasaresultoftodayssession,
		'[Host]': data.host === 'Yes',
		'[Facilitate]': data.facilitate === 'Yes',
		'[Volunteer]': data.volunteer === 'Yes',
		'Cash Donation': parseInt(data.cashdonationamountnotcreditcards, 10) || null,
		'Name': data.participantname,
		'Email': data.participantemail,
		'Timestamp': data.timestamp,
		'Date of Conversation': data.conversationdate,
		'Phone': data.participantmobile,
		'Conversation': [conversation.id],
	}));
	/* eslint-enable quote-props */

	console.log(`Airtables: upserting conversation donations for ${conversationId}`);
	promises.push(airtables.upsert('Conversation Donations', { 'Conversation Name': conversationId }, {
		Conversation: [conversation.id],
	}));

	if (data.facilitate && (data.facilitate !== '')) {
		console.log(`Airtables: upserting new facilitator ${data.participantname}`);
		promises.push(airtables.upsert(
			'Facilitators',
			[{ Email: data.participantemail }, { Name: data.participantname }],
			{
				Email: data.participantemail,
				Name: data.participantname,
				Status: 'Emerging',
				Team: facilitator.fields.Team,
				Phone: data.participantmobile,
				Mentor: [facilitator.id],
				'Added On': data.conversationdate,
				'Recruited At': [conversation.id],
			},
		));
	}

	if (data.host && (data.host !== '')) {
		console.log(`Airtables: upserting new host ${data.participantname}`);
		promises.push(airtables.upsert(
			'Hosts',
			[{ Email: data.participantemail }, { Name: data.participantname }],
			{
				Email: data.participantemail,
				Name: data.participantname,
				Phone: data.participantmobile,
				'Facilitator responsible': [facilitator.id],
				'Recruited At': [conversation.id],
				'Added On': data.conversationdate,
			},
		));
	}

	return Promise.all(promises);
}

module.exports = { syncGuestToFtl };
