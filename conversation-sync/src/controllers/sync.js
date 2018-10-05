const { syncGuestToKepla } = require('./kepla');
const { syncGuestToFtl } = require('./ftl');
const { sheetsToIsoDate, dateKeys } = require('./helpers/dateHelpers');

class Sync {
	async receive(req, res) {

	}

	// eslint-disable-next-line class-methods-use-this
	async syncGuest(payload) {
		// Pull data out of datastore

		// FIXME validate essential keys in record (eg host, facil, guest email)

		// remove gsx$ from payload keys
		const data = removeGsxFromKeys(payload);

		// Convert dates fo iso
		dateKeys.forEach((key) => { data[key] = sheetsToIsoDate(data[key]); });

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
