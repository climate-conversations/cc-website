const _ = require('lodash');
const BackendReportController = require('../src/controllers/BackendReportController');
const { raiselyRequest } = require('../src/helpers/raiselyHelpers');

/**
 * Utility to manually sync donations to the donations spreadsheet
 */
async function fetchAndSyncGuests() {
	const controller = new BackendReportController({
		log: console.log,
	});

	const startAtGTE = process.env.START || '2020-01-01';

	console.log('Fetching conversations since', startAtGTE);
	const rsvps = _.sortBy(await raiselyRequest({
		path: '/event_rsvps',
		query: 	{ 'event.startAtGTE': startAtGTE, private: 1, campaign: 'cc-volunteer-portal', limit: 1000 },
		token: process.env.RAISELY_TOKEN,
	}), (a) => a.event.startAt);

	for (let i=0; i < rsvps.length; i++) {
		const rsvp = rsvps[i];
		// Don't process legacy
		if (!_.get(rsvp, 'private.legacyId')) {
			console.log(`Processing ${rsvp.event.startAt}, ${rsvp.uuid} ${rsvp.event.name} ${rsvp.user.fullName || rsvp.user.preferredName}`);
			const [preSurvey, postSurvey] = await loadSurveys(rsvp);
			const guestData = { rsvp, conversation: rsvp.event, user: rsvp.user, preSurvey, postSurvey};

			await controller.process({
				data: { type: 'guest.created', data: guestData },
			});
		}
	}
}

async function loadSurveys(eventRsvp) {
	const surveyCategories = {
		preSurvey: 'cc-pre-survey-2020',
		postSurvey: 'cc-post-survey-2020',
	};
	const promises = ['pre', 'post'].map(key => {
		return raiselyRequest({
			path: '/interactions',
			query: {
				private: 1,
				category: surveyCategories[`${key}Survey`],
				user: eventRsvp.userUuid,
			},
			token: process.env.RAISELY_TOKEN,
		})
		.then(results => results.find(r => (r.recordUuid === eventRsvp.eventUuid)));
	});
	return Promise.all(promises);
}

fetchAndSyncGuests().catch(console.error);
