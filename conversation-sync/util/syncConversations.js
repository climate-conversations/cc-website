/**
 * Sync conversations and attendees from this list
 * https://docs.google.com/spreadsheets/d/13ZYzIIgBRQMEd-dADo-gWJLon7aVs_lF7p1iwHr8Ycg/edit#gid=0
 * into Raisely CRM
 */

require('dotenv').config();

const _ = require('lodash');
const shortUuid = require('short-uuid');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const cache = require('nano-cache');
const { raiselyRequest: callRaisely } = require('../src/helpers/raiselyHelpers');
const cachePromises = {};
const tzc = require('timezonecomplete');

const SPREADSHEET_KEY = process.env.SPREADSHEET_KEY;
const SHEET_NAME = process.env.SHEET_NAME;
const RAISELY_TOKEN = process.env.RAISELY_TOKEN;
const CAMPAIGN_UUID = process.env.CAMPAIGN_UUID;

const sgTime = tzc.zone('Asia/Singapore');

// We don't know the time, so set the date to YYYY-MM-dd 00:00 in SG time
const convertDate = (excelDate) => {
	const localDate = (new tzc.DateTime(new Date(1900, 0, --excelDate), tzc.DateFunctions.Get));
	const sgDate = new tzc.DateTime(localDate.format('YYYY-MM-dd HH:mm'), sgTime);
	return sgDate;
}


const toBool = val => {
	return (val && val.length);
}

const ethnicity = (e) => {
	return e;
};
const gender = g => {
	if (!g) return null;
	const options = ["na", "female", "male"];
	if (options.includes(g.toLowerCase())) return g.toLowerCase();
	return options[0];
}
const residency = (r) => {
	if (r && r.toLowerCase().includes('singapor')) return 'Singapore Citizen';
	return r;
}

async function raiselyRequest(opts) {
	opts.token = RAISELY_TOKEN;
	return callRaisely(opts);
}

/**
 * Helper to cache a request
 * A lot of requests for hosts, facils, conversations will be repetative
 * This takes a function that upserts those and caches the result
 * for future calls
 * @param {function} fn function that retrieves the record
 * @param {function} getKey function to determine the cache key from the arguments
 */
function cachify(fn, getKey) {
	return async function(...args) {
		const key = getKey(...args);
		let record = cache.get(key);
		if (!record) {
			let promise = cachePromises[key];
			if (!promise) {
				cachePromises[key] = promise = fn(...args);
			}
			record = await promise;
			if (cachePromises[key]) {
				delete cachePromises[key];
				cache.set(key, record);
			}
		}
		return record;
	}
}

/**
 * Find a user by a particular attribute
 * @param {string} attribute 'email' or 'phoneNumber'
 * @param {object} record The user record
 */
async function findUserBy(attribute, record) {
	if (!record[attribute]) return [];
	let value = record[attribute];
	// Raisely unique check is case insensitive, but the search is case sensitive
	if (attribute === 'email') value = value.toLowerCase();
	const query = { [attribute]: value };
	query.private = 1;
	return raiselyRequest({
		query,
		path: '/users',
	});
}

/**
 * Upsert a user record
 * @param {object} user The user record to upsert
 */
const upsertPerson = cachify(async (user, opts) => {
	const promises = [
		findUserBy('email', user),
		findUserBy('phoneNumber', user),
		findUserBy('fullName', user),
	];
	const results = await Promise.all(promises);
	// Take the first matching result (ie email, or phone if not found)
	let [userRecord] = results.reduce((all, c) => all.concat(c), []);
	if (userRecord) {
		console.log(`Found person ${user.email || user.fullName}`);
		const updateKeys = ['private.residency', 'phoneNumber', 'private.gender', 'private.ethnicity', 'private.dateOfBirth', 'fullName'];
		const toUpdate = {};
		let shouldUpdate;
		updateKeys.forEach(key => {
			const oldValue = _.get(userRecord, key);
			const newValue = _.get(user, key);
			if (newValue && !oldValue) {
				_.set(toUpdate, key, newValue);
				shouldUpdate = true;
			}
		});
		// Add recruiter record
		if (opts.recruiter) {
			['private.recruitedBy', 'private.pointPerson'].forEach(key => {
				if (!_.get(user, key)) {
					_.set(user, key, opts.recruiter)
					shouldUpdate = true;
				}
			});
		}
		// If email was just a place holder and we have a real one, replace it
		if (user.email && userRecord.email.endsWith('.invalid')) toUpdate.email = userRecord.email;

		if (shouldUpdate) {
			console.log(`Updating user`, toUpdate)
			await raiselyRequest({
				method: 'PATCH',
				path: `/users/${userRecord.uuid}`,
				data: toUpdate,
			});
		}
		return userRecord;
	}

	const shortRand = shortUuid();
	const unique = shortRand.new();
	// eslint-disable-next-line no-param-reassign
	user.email = `no-email-${_.camelCase(user.fullName)}-${unique}@noemail.invalid`;

	console.log(`Creating person ${user.email}`);

	return raiselyRequest({
		method: 'POST',
		path: '/users',
		data: user,
	});
}, (user) => user.email || user.phoneNumber || user.fullName);

/**
 * Upsert a conversation
 * @param {object} details
 * @param {object} details.name
 * @param {object} details.date
 * @param {object} details.host
 * @param {object} details.facilitator
 * @returns {object} conversation
 */
const upsertConversation = cachify(async (details) => {
	const allRsvps = await raiselyRequest({
		path: '/event_rsvps',
		query: {
			user: details.host.uuid,
			type: 'host',
			private: 1,
			campaign: CAMPAIGN_UUID,
			limit: 1000,
			// ['event.legacyId']: details.legacyId,
			// ['event.startAtGTE']: details.date.toIsoString(),
			// ['event.startAtLTE']: details.date.toIsoString(),
			// ['event.startAtLTE']: details.date.add(1, tzc.TimeUnit.Day).toIsoString(),
		},
	});
	// Find an exact match by legacy ID
	const rsvp = allRsvps.find(r => _.get(r, 'event.private.legacyId') === details.legacyId);

	const existingEvent = _.get(rsvp, 'event');
	if (existingEvent) {
		console.log(`Found existing conversation ${existingEvent.uuid}`);

		const legacyId = _.get(existingEvent, "private.legacyId");
		if (legacyId && legacyId !==  details.legacyId) {
			throw new Error(`Conversation has wrong legacy ID (expected none or ${details.legacyId} got ${legacyId})`);
		}
		// Set correct event start date
		await raiselyRequest({
			path: `/events/${existingEvent.uuid}`,
			method: "PATCH",
			data: {
				startAt: singaporeToISO
			},
		});
		return existingEvent;
	}

	console.log(`Creating conversation`);
	const conversation = await raiselyRequest({
		path: `/campaigns/${CAMPAIGN_UUID}/events`,
		method: 'POST',
		data: {
			name: details.name,
			startAt: details.date.toIsoString(),
			userUuid: details.facilitator.uuid,
			isPrivate: true,
			private: {
				conversationType: 'private',
				isProcessed: true,
				status: 'completed',
				legacyId: details.legacyId,
			},
		},
	});

	return conversation;
}, (details) => `conv-${details.host.uuid}-${details.date.toIsoString()}`);

/**
 * Upsert a cash donation, and associate a donation with the conversation if it should be
 */
function upsertDonation({ conversation, guest, cashDonation }) {
	// Find donations within 2 weeks of the conversation
	const donations = await raiselyRequest({
		path: '/donations',
		query: {
			user: guest.uuid,
			private: 1,
			campaign: CAMPAIGN_UUID,
		},
	});
	donations.map(d => {
		if (_.get(d, 'private.'))
	})
	// Associate the donation if it isn't already
	// Create cash donation if one doesn't exist
}

/**
 * @param {object} rsvp.conversation
 * @param {object} rsvp.guest
 */
const upsertRsvp = cachify(async (rsvp) => {
	const record = await raiselyRequest({
		path: `/events/${rsvp.conversation.uuid}/rsvps`,
		query: {
			private: 1,
			user: rsvp.guest.uuid,
			type: rsvp.type,
		},
	});
	if (record[0]) {
		console.log(`Exising RSVP for ${rsvp.type} found`)
		return record[0];
	}
	console.log(`Creating RSVP for ${rsvp.type || 'guest'}`)

	return raiselyRequest({
		path: `/events/${rsvp.conversation.uuid}/rsvps`,
		method: 'POST',
		data: {
			userUuid: rsvp.guest.uuid,
			type: rsvp.type || 'guest',
			attended: true,
		}
	})
}, (rsvp) => `rsvp-${rsvp.conversation.uuid}-${rsvp.type || 'guest'}-${rsvp.guest.uuid}`);

/**
 * Extract the header row from a GoogleWorksheet
 * @param {GoogleWorksheet} sheet
 * @returns {string[]} Array of headers in order
 */
async function getHeaderRow(sheet) {
	await sheet.loadCells({ startRowIndex: 0, endRowIndex: 1 });
	const headers = [];
	_.times(sheet.columnCount)
		.forEach((column) => {
			let header = (sheet.getCell(0, column).value || '').trim();
			// If it's a duplicate, concat the prior header to get a unique value
			if (header && headers.includes(header)) {
				header = _.last(headers) + ' ' + header;
			}
			// If it's still not unique, we're in trouble
			if (header && headers.includes(header)) {
				throw new Error(`Non-unique header ${header}`);
			}
			headers.push(header);
		});
	return headers;
}


/**
 * Paginate over the rows of the spreadsheet
 * @param {function(row)} callback
 */
async function paginateRows(callback) {
	console.log('Loading spreadsheet')
	const document = new GoogleSpreadsheet(SPREADSHEET_KEY);

	let credentials;
	if (process.env.GOOGLE_CREDENTIALS_JSON) {
		const jsonCreds = require(process.env.GOOGLE_CREDENTIALS_JSON);
		credentials = _.pick(jsonCreds, ['client_email', 'private_key']);
	} else {
		credentials = {
			// use service account creds
			client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
			private_key: process.env.GOOGLE_PRIVATE_KEY,
		};
	}
	await document.useServiceAccountAuth(credentials);

	// loads document properties and worksheets
	await document.loadInfo();

	const worksheet = document.sheetsByIndex.find(sheet => sheet.title === SHEET_NAME);
	if (!worksheet) {
		throw new Error(`Could not find spreadseheet ${SHEET_NAME}`);
	}

	const header = await getHeaderRow(worksheet);

	const limit = 100;
	let offset = process.env.OFFSET || 1;
	let row;

	do {
		if (offset > worksheet.rowCount) return;
		console.log('Loading new rows from offset:', offset);
		const upperLimit = Math.min(offset + limit, worksheet.rowCount);
		await worksheet.loadCells({ startRowIndex: offset, endRowIndex: upperLimit });
		for (let i = offset; i < upperLimit; i++) {
			row = {};
			header.map((title, column) => { row[title] = worksheet.getCell(i, column).value; });
			if (row['Participant Name']) {
				await callback(row, i);
			}
		}
		offset += limit;
	} while (true);
}

async function syncConversations() {
	await paginateRows(async (row, offset) => {
		console.log(`=== (${offset}) New row ${row['Participant Name']} attended ${row['Host Name']} on ${convertDate(row['Date of Conversation']).format('YYYY-MM-dd')}`);
		const [facilitator, host] = await Promise.all([
			upsertPerson({
				fullName: row['Facilitator Name'],
				email: row['Facilitator Email Address'],
			}),
			upsertPerson({
				fullName: row['Host Name'],
				email: row['Host Email Address'],
			}),
		]);

		const guest = await upsertPerson({
			fullName: row["Participant Name"],
			email: row["Email"],
			phoneNumber: row["Phone"],
			private: {
				dateOfBirth: convertDate(
					row["Date of Birth"]
				).toIsoString(),
				host: toBool(row["[Host]"]),
				facilitate: toBool(row["[Facilitate]"]),
				volunteer: toBool(row["[Volunteer]"]),
				mailingList: true,
				gender: gender(row["Gender"]),
				ethnicity: ethnicity(row["Ethnicity"]),
				residency: residency(row["Residential Status"]),
			},
		}, { recruiter: facilitator.uuid });

		console.log(`Guest is ${guest.fullName} ${guest.email}`);

		// find or create conversation
		const conversation = await upsertConversation({
			name: `${row['Host Name']}'s Conversation`,
			date: convertDate(row['Date of Conversation']),
			host,
			facilitator,
			legacyId: row['Conversation ID'],
		});
		const [rsvp] = await Promise.all([
			upsertRsvp({
				conversation,
				guest,
				type: 'guest'
			}),
			upsertRsvp({
				conversation,
				guest: facilitator,
				type: 'facilitator',
			}),
			upsertRsvp({
				conversation,
				guest: host,
				type: 'host',
			}),
			upsertDonation({
				conversation,
				guest,
				cashDonation: row['Cash Donation']
			}),
			upsertSurvey({
				conversation,
				guest,
				row
			})
		]);
		// TODO find or create donation
		// TODO find or create surveys
	});
}

syncConversations().catch(console.error);
