require('dotenv').config();
const sheets = require('../src/services/sheets');

const { syncGuestToKepla } = require('../src/processors/kepla');
const { syncGuestToFtl } = require('../src/processors/ftl');
const { sheetsToIsoDate, dateKeys } = require('../src/helpers/dateHelpers');

async function run() {
	const rows = await sheets.fetchRows(427 - 362).catch(console.error);
	let completed = 0;

	try {
		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];

			console.log(`*** Syncing ${row.hostname}'s guest ${row.participantname} (from conversation on ${row.conversationdate})`);
			// eslint-disable-next-line no-await-in-loop
			await syncGuest(row);
			completed += 1;
		}
	} finally {
		console.log(`** ${completed} of ${rows.length} synced **`);
	}
}

async function syncGuest(payload) {
	// Pull data out of datastore

	// FIXME validate essential keys in record (eg host, facil, guest email)

	// remove gsx$ from payload keys
	const data = removeGsxFromKeys(payload);

	// Convert dates fo iso
	if (!data.conversationdate) throw new Error('Cannot process a conversation that does not have a date');
	dateKeys.forEach((key) => { data[key] = data[key] ? sheetsToIsoDate(data[key]) : null; });

	// Sync Kepla
	const keplaPromise = syncGuestToKepla(data)
		.then(() => {
			// Mark record kepla synced
		});

	const ftlPromise = syncGuestToFtl(data)
		.then(() => {
			// Mark record ftl synced
		});

	return Promise.all([keplaPromise, ftlPromise]);
}


/**
  * Remove gsx$ from google sheet data keys
  * @param {object} data Original data from google sheets
  * @return {object} Same object with keys renamed to remove gsx$
  */
function removeGsxFromKeys(data) {
	const newData = {};
	Object.keys(data).forEach((k) => {
		const newKey = k.split('gsx$').join('');
		newData[newKey] = data[k];
	});

	return newData;
}

run().catch(console.error);
