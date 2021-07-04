const _ = require('lodash');
const DonationSpreadsheetController = require('../src/controllers/DonationSpreadsheetController');
const { raiselyRequest } = require('../src/helpers/raiselyHelpers');

/**
 * Utility to manually sync donations to the donations spreadsheet
 */
async function fetchAndSyncDonations() {
	const controller = new DonationSpreadsheetController({
		log: console.log,
	});

	const startAtGTE = process.env.START || '2020-01-01';

	console.log('Fetching conversations since', startAtGTE)
	const events = await raiselyRequest({
		path: '/campaigns/cc-volunteer-portal/events',
		query: 	{ startAtGTE, private: 1 },
		token: process.env.RAISELY_TOKEN,
	});

	for (let i=0; i < events.length; i++) {
		const event = events[i];
		// Don't process legacy
		if (!_.get(event, 'private.legacyId')) {
			console.log(`Processing ${event.uuid} ${event.name}`, event.private);
			await controller.process({
				data: { type: 'event.updated', data: event },
			});
		}
	}
}

fetchAndSyncDonations().catch(console.error);
