const TZC = require('timezonecomplete');
const kepla = require('../services/kepla');

const dateKeys = ['dateofbirth', 'conversationdate'];

class Sync {
	async processGuest(payload) {
		// Pull data out of datastore

		// FIXME validate essential keys in record (eg host, facil, guest email)

		// remove gsx$ from payload keys
		const data = removeGsxFromKeys(payload);

		// Convert dates fo iso
		dateKeys.forEach(key => { data[key] = sheetsToIsoDate(data[key]) });

		// Sync Kepla
		const keplaPromise = syncGuestToKepla(data)
			.then(() => {
				// Mark record kepla synced
			})
			.catch((err) => {
				console.error(err);
			});

		const ftlPromise = syncGuestToFtl(data)
			.then(() => {
				// Mark record ftl synced
			})
			.catch((err) => {
				console.error(err);
			});

		return Promise.all([keplaPromise, ftlPromise]);
	}
}

async function syncGuestToFtl(data) {
	// Find / create facil
	// Find / create host
	// Find / create conversation
	// Find / create guests

	// Add prospect facil
	// Add prospect host
}

async function syncGuestToKepla(data) {
	// Clone the data
	// eslint-disable-next-line no-param-reassign
	data = Object.assign({}, data);

	dateKeys.forEach((key) => { data[key] = isoDateToKeplaDate(data[key]); });
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

/**
  * Converts a given date string to an iso8601 date (yyyy-mm-dd)
  * Also assumes that the date is in american (mm/dd/yyyy) UNLESS
  * the month > 12
  * @param {string} googleDate The date from google
  * @returns {string} The date in 'yyyy-mm-dd' format
  */
function sheetsToIsoDate(dateStr) {
	// Google sheets is incorrectly storing as US date format
	// eslint-disable-next-line prefer-const
	let [month, day, year] = dateStr.split('/');

	// But, if it doesn't fit in a US date (ie the day > 12) then it stores
	// it in GB date format
	if (parseInt(month, 10) > 12) {
		const tmp = day;
		day = month;
		month = tmp;
	}

	const isoDate = [year.padStart(4, '0'), month.padStart(2, '0'), day.padStart(2, '0')].join('-');

	return isoDate;
}

/**
  * Kepla stores dates with timezones, so every date needs to be converted to
  * Singapore time to be consistent with kepla dates
  * @param {string} isoDate Date in the form 'yyyy-mm-dd'
  * @returns {string} Date formatted in iso8601, utc time
  */
function isoDateToKeplaDate(isoDate) {
	return TZC.DateTime(isoDate).withZone(TZC.zone('Singapore/Singapore')).toUtcString();
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
