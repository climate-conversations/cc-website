const guestData = require('./guestData');
const _ = require('lodash');

let createdGuest;

describe('Sync controller', () => {
	describe('post', () => {
		it('saves the update in datastore');
		it('sends a pubsub event');
	});

	describe('syncGuest', () => {
		describe('WHEN new record', () => {
			it('syncs to airtables');
			it('syncs to kepla');
		});
		describe('WHEN kepla is processed', () => {
			it('syncs to airtables');
			it('does not sync to kepla');
		});
		describe('WHEN airtables is processed', () => {
			it('syncs to kepla');
			it('does not sync to airtables');
		});
		describe('WHEN all synced', () => {
			it('does nothing');
		});
	});
});

function nockAirtables() {
	const airtablesScope = nock('https://api.airtable.com');
	const baseName = process.env.AIRTABLES_BASE;

	const conversationDate = '2018-02-11';

	const facilitatorId = 'rec-------------1';
	const otherFacilitatorId = 'rec-------------X';
	const hostId = 'rec-------------2';
	const facilitatorRecord = {
		id: facilitatorId,
		fields: {
			Name: 'Aaron Sorkin',
			Email: 'aaron@cc.test',
			Team: 'Telford',
			Status: 'Emerging',
			id: 'Aaron Sorkin (aaron@cc.test)',
		},
	};
	const hostRecord = {
		id: hostId,
		fields: {
			Name: guestData.hostname,
			Email: guestData.hostemailaddress,
			id: `${guestData.hostname} (${guestData.hostemailaddress})`,
		},
	};
	const conversationName = `2018-02-11 ${hostRecord.fields.id}`;
	const conversationId = 'rec-------------3';
	const conversationRecord = {
		id: conversationId,
		fields: {
			Facilitator: [otherFacilitatorId],
			Host: [hostId],
			Date: '2018-02-11',
			Name: conversationName,
		},
	};

	airtablesScope
		// Find facilitator
		.get(`/v0/${baseName}/Facilitators`)
		.query({ maxRecords: 3, filterByFormula: `{Email = '${guestData.facilitatoremailaddress}' }` })
		.reply(200, [facilitatorRecord])

		// Find host
		.get(`/v0/${baseName}/Hosts`)
		.query({ maxRecords: 3, filterByFormula: `{Email = '${guestData.hostemailaddress}' }` })
		.reply(200, [hostRecord])
		// Update Host
		.patch(`/v0/${baseName}/Hosts/${hostId}`, {
			fields: {
				'Facilitator responsible': [facilitatorId],
			},
		})
		.reply(200, _.merge({ fields: { 'Facilitator responsible': [facilitatorId] } }, hostRecord))

		// Find conversation
		.get(`/v0/${baseName}/Conversations`)
		.query({ maxRecords: 3, filterByFormula: `{Name = '${conversationName}' }` })
		.reply(200, [conversationRecord])
		// Add new facilitator to conversation
		.patch(`/v0/${baseName}/Conversations/${conversationId}`, {
			fields: {
				'Facilitator responsible': [otherFacilitatorId, facilitatorId],
			},
		})
		.reply(200, conversationRecord)

		// Find no guest
		.get(`/v0/${baseName}/Guests`)
		.query({ maxRecords: 3, filterByFormula: `{Id = '${guestData.participantname} - ${conversationDate}' }` })
		.reply(200, [])
		// Create guest
		.post(`/v0/${baseName}/Guests`)
		.reply(200, (uri, requestBody) => {
			createdGuest = requestBody.fields;
		})

		// Create facilitator
		.get(`/v0/${baseName}/Facilitators`)
		.query({ maxRecords: 3, filterByFormula: `{Email = '${guestData.participantemail}' }` })
		.reply(200, [])
		.post(`/v0/${baseName}/Facilitators`)
		.reply(200, facilitatorRecord)

		// Create host
		.get(`/v0/${baseName}/Hosts`)
		.query({ maxRecords: 3, filterByFormula: `{Email = '${guestData.participantemail}' }` })
		.reply(200, [])
		.post(`/v0/${baseName}/Hosts`)
		.reply(200, hostRecord);
}

function nockKepla() {
	const keplaScope = nock('https://api.kepla.com');
	const personType = '7c12b42d-26eb-43c7-a3d1-25045869cbf6';

	keplaScope
		// Find no host
		.get(`/v1/types/${personType}/search`)
		.query({ limit: 50, offset: 0, filter: 'all', count: 'estimate',
			q: `Hy5iBgCkb:${guestData.hostemailaddress}` })
		.reply(200, { records: [] })
		// Create host
		.post(`/v1/types/${personType}`, {hostRecord})
		.reply(200, {hostRecord})

	// Find facilitator
	// (No update)
	// Find guest, some data
	// Update guest
	// Find facil user

	// Find conversation

	// User is already assigned to conversation, do nothing
	// Assign user to guest
	// Add guest to conversation
}
