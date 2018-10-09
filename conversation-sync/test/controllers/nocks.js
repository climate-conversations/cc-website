const nock = require('nock');
const _ = require('lodash');
const guestData = require('./guestData');

let createdGuest;

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

	return airtablesScope
		// Find facilitator
		.get(`/v0/${baseName}/Facilitators`)
		.query({ maxRecords: 3, filterByFormula: `{Email}='${guestData.facilitatoremailaddress}'` })
		.reply(200, { records: [facilitatorRecord] })

		// Find host
		.get(`/v0/${baseName}/Hosts`)
		.query({ maxRecords: 3, filterByFormula: `{Email}='${guestData.hostemailaddress}'` })
		.reply(200, { records: [hostRecord] })
		// Update Host
		.patch(`/v0/${baseName}/Hosts/${hostId}?`, {
			fields: {
				'Facilitator responsible': [facilitatorId],
			},
		})
		.reply(200, _.merge({ fields: { 'Facilitator responsible': [facilitatorId] } }, hostRecord))

		// Find conversation
		.get(`/v0/${baseName}/Conversations`)
		.query({ maxRecords: 3, filterByFormula: `{Name}='${conversationName}'` })
		.reply(200, { records: [conversationRecord] })
		// Add new facilitator to conversation
		.patch(`/v0/${baseName}/Conversations/${conversationId}?`, {
			fields: {
				Facilitator: [otherFacilitatorId, facilitatorId],
			},
		})
		.reply(200, conversationRecord)

		// Find no guest
		.get(`/v0/${baseName}/Guests`)
		.query({ maxRecords: 3, filterByFormula: `{Id}='${guestData.participantname} - ${conversationDate}'` })
		.reply(200, { records: [] })
		// Create guest
		.post(`/v0/${baseName}/Guests/?`)
		.reply(200, (uri, requestBody) => {
			createdGuest = requestBody.fields;
			return { id: 'rec-------------G' };
		})

		// Create facilitator
		.get(`/v0/${baseName}/Facilitators`)
		.query({ maxRecords: 3, filterByFormula: `{Email}='${guestData.participantemail}'` })
		.reply(200, { records: [] })
		.post(`/v0/${baseName}/Facilitators/?`)
		.reply(200, facilitatorRecord)

		// Create host
		.get(`/v0/${baseName}/Hosts`)
		.query({ maxRecords: 3, filterByFormula: `{Email}='${guestData.participantemail}'` })
		.reply(200, { records: [] })
		.post(`/v0/${baseName}/Hosts/?`)
		.reply(200, hostRecord)

		// Create conversation donations
		.get(`/v0/${baseName}/Conversation%20Donations`)
		.query({
			maxRecords: 3,
			filterByFormula: `{Conversation Name}='${conversationName}'`,
		})
		.reply(200, { records: [] })
		.post(`/v0/${baseName}/Conversation%20Donations/?`, {
			fields: { Conversation: [conversationId] }
		})
		.reply(200, {})
}

function nockKepla() {
	const keplaScope = nock('https://api.kepla.com');
	const personType = '7c12b42d-26eb-43c7-a3d1-25045869cbf6';
	const conversationType = '78d9db74-e0bd-4cd0-97f0-49b259509a47';

	const hostPost = {
		Hy5iBgCkb: guestData.hostemailaddress,
		BJ6OBe0kb: guestData.hostname,
	};
	const hostRecord = {
		typeId: '7c12b42d-26eb-43c7-a3d1-25045869cbf6',
		id: '3b4d043f-7e0c-4695-9841-757b02235e37',
		primaryKey: guestData.hostemailaddress,
	};
	const facilRecord = {
		BJ6OBe0kb: 'Aaron Sorkin',
		Hy5iBgCkb: guestData.facilitatoremailaddress,
		typeId: '7c12b42d-26eb-43c7-a3d1-25045869cbf6',
		id: '9c6bb353-7c51-448a-a785-9c8564dd30bc',
		primaryKey: guestData.facilitatoremailaddress,
	};
	const shortGuestRecord = {
		Hy5iBgCkb: guestData.participantemail,
		BJ6OBe0kb: guestData.participantname,
		users: [
			{
				name: 'Chris Bob',
				id: '04975dd0-279d-41d6-b111-84b2508dfb11',
				email: 'cb@cc.test',
			},
		],
		S1kmeTPmM: 'unsubscribed',
		typeId: '7c12b42d-26eb-43c7-a3d1-25045869cbf6',
		id: '9c6bb353-7c51-448a-a785-9c8564dd30bc',
		primaryKey: guestData.participantemail,
		updatedAt: '2018-10-05T02:21:00.480Z',
		display: {
			title: guestData.participantname,
			subtitle: `9844 8837 6816 1000 ${guestData.participantemail}`,
		},
		mailchimp: 'unsubscribed',
	};
	const moreGuestRecord = {
		rkchXl0yZ: guestData.participantmobile,
		BJBu0SgRyZ: 'Singapore',
		BJ5bOPOZm: 'Permanent Resident',
		ry8dRHeCkb: guestData.participantpostcode,
		B1cBEJsGZ: 'Yes',
		SkjIEkjfZ: 'Yes',
		BkUvEyjMb: 'Yes',
		meta: {
			communications: { Hy5iBgCkb: true, rkchXl0yZ: true },
		},
	};
	const completeGuestRecord = Object.assign({}, shortGuestRecord, moreGuestRecord);

	const facilUser = {
		email: 'sorkin@cc.test',
		id: '049752d0-279d-41d6-b111-84b2508dfb11',
		name: 'Aaron Sorkin',
	};

	const conversationRecord = {
		B1G5Vx0kW: facilRecord.id,
		users: [facilUser],
		B1CZNl0Jb: '2018-02-10T16:00:00.000Z',
		B1rIHIgRyW: 'Singapore',
		rkLIBUg01Z: '138593',
		'SyT7kqoi-': 'Completed',
		SyzUNxRJb: hostRecord.id,
		typeId: '78d9db74-e0bd-4cd0-97f0-49b259509a47',
		id: '89a2d2cc-fe01-4870-a95e-b0b4459ff6b3',
	};

	const conversationGuestPost = {
		related: shortGuestRecord.id,
		taxonomyId: 'a473d935-d644-46f1-9e0c-826d7795c9b3',
	};

	return keplaScope
		// Find no host
		.post(`/v1/types/${personType}/records`, { Hy5iBgCkb: guestData.hostemailaddress })
		.query({
			update: true,
		})
		.reply(404, {
			id: hostRecord.id,
			typeId: personType,
			Hy5iBgCkb: guestData.hostemailaddress,
		})
		// Create host
		.put(`/v1/types/${personType}/records/${hostRecord.id}`)
		.reply(200, hostRecord)

		// Find facilitator
		.post(`/v1/types/${personType}/records`, { Hy5iBgCkb: guestData.facilitatoremailaddress })
		.query({
			update: true,
		})
		.reply(200, facilRecord)

		// Find guest
		.post(`/v1/types/${personType}/records`, { Hy5iBgCkb: guestData.participantemail })
		.query({
			update: true,
		})
		.reply(200, shortGuestRecord)
		// Update guest
		.put(`/v1/types/${personType}/records/${shortGuestRecord.id}`, moreGuestRecord)
		.reply(200, completeGuestRecord)

		// Find facil user
		.get('/v1/users')
		.reply(200, [facilUser])

		// Find conversation
		.get(`/v1/types/${conversationType}/records`)
		.query({
			order: 'desc',
			orderBy: 'B1CZNl0Jb',
			limit: 50,
			offset: 0,
		})
		.reply(200, { records: [conversationRecord] })

		// User is already assigned to conversation, do nothing

		// Refresh records for user assignment
		.get(`/v1/types/${conversationType}/records/${conversationRecord.id}`)
		.reply(200, conversationRecord)
		.get(`/v1/types/${personType}/records/${completeGuestRecord.id}`)
		.reply(200, completeGuestRecord)

		// Assign user to guest
		.put(`/v1/types/${personType}/records/${shortGuestRecord.id}/users/${facilUser.id}`)
		.reply(200, {})

		// Add guest to conversation
		.post(`/v1/relationships/${conversationRecord.id}`, conversationGuestPost)
		.reply(200, {});
}

module.exports = {
	nockAirtables,
	nockKepla,
};
