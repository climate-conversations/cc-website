const headers = [
	'GuestId',
	'Full Name',
	'Conversation Name',
	'Conversation Date',
	'Conversation Time',
	'Conversation Uuid',
	'Preferred Name',
	'Email',
	'Phone Number',
	'Host Full Name',
	'Host Email',
	'Facilitator Full Name',
	'Facilitator Email',
	'Given To Green',
	'Issues',
	'Values',
	'Society Priority Before',
	'Talkativeness Before',
	'Agency Before',
	'Hope Before',
	'Society Priority After',
	'Talkativeness After',
	'Agency After',
	'Hope After',
	'Recommend',
	'Host',
	'Facilitate',
	'Fundraise',
	'Research',
	'Host Corporate',
	'Volunteer',
	'Donation Intention',
	'Donation Amount',
];

const campaignConfig = {
	interactionCategoryFields: {
		"cc-pre-survey-2020": [
			"givenToGreen",
			"issues",
			"values",
			"societyPriority",
			"talkativeness",
			"agency",
			"hope",
		],
		"cc-post-survey-2020": [
			"societyPriority",
			"talkativeness",
			"agency",
			"hope",
			"recommend",
			"host",
			"facilitate",
			"fundraise",
			"research",
			"hostCorporate",
			"volunteer"
		],
	},
};

const guestData = {
	user: {
		fullName: 'Sam Seaborne',
		preferredName: 'Sam',
		email: 'sam@cc.test',
		phoneNumber: '12345678',
		postcode: '123456',
	},
	conversation: {
		uuid: 'conversation-uuid',
		startAt: '2020-01-15T12:34:00 +00:00',
		name: 'Joes Conversation',
	},
	preSurvey: {
		private: {
			givenToGreen: 'weekly',
			hope: 5,
			agency: 1,
		},
	},
	postSurvey: {
		private: {
			hope: 9,
			talkativeness: 10,
			research: true,
			hostCorporate: true,
		},
	},
	rsvp: {
		uuid: 'rsvp-uuid',
		eventUuid: 'conversation-uuid',
		private: {
			donationIntention: 'cash',
			donationAmount: 2000,
		},
	},
}

function getExpectedRow({ facilitator, host }) {
	return {
		'GuestId': guestData.rsvp.uuid,
		'Full Name': guestData.user.fullName,
		'Conversation Name': guestData.conversation.name,
		'Conversation Date': '2020-01-15',
		'Conversation Time': '20:34',
		'Conversation Uuid': 'conversation-uuid',
		'Preferred Name': guestData.user.preferredName,
		'Email': guestData.user.email,
		'Phone Number': guestData.user.phoneNumber,
		'Host Full Name': host.fullName,
		'Host Email': host.email,
		'Facilitator Full Name': facilitator.fullName,
		'Facilitator Email': facilitator.email,
		'Issues': undefined,
		'Values': undefined,
		'Given To Green': 'weekly',
		'Society Priority Before': guestData.preSurvey.private.societyPriority,
		'Talkativeness Before': undefined,
		'Agency Before': guestData.preSurvey.private.agency,
		'Hope Before': guestData.preSurvey.private.hope,
		'Society Priority After': guestData.postSurvey.private.societyPriority,
		'Talkativeness After': guestData.postSurvey.private.talkativeness,
		'Agency After': undefined,
		'Hope After': guestData.postSurvey.private.hope,
		'Fundraise': undefined,
		'Research': true,
		'Host': undefined,
		'Facilitate': undefined,
		'Host Corporate': true,
		'Donation Intention': 'cash',
		'Donation Amount': 20.00,
	};
}

module.exports = {
	guestData,
	campaignConfig,
	headers,
	getExpectedRow,
};
