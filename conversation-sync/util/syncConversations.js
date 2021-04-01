/**
 * Sync conversations and attendees from this list
 * https://docs.google.com/spreadsheets/d/13ZYzIIgBRQMEd-dADo-gWJLon7aVs_lF7p1iwHr8Ycg/edit#gid=0
 * into Raisely CRM
 */

/* eslint-disable no-console */

require('dotenv').config();

const _ = require('lodash');
const shortUuid = require('short-uuid');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const cache = require('nano-cache');
const { raiselyRequest: callRaisely } = require('../src/helpers/raiselyHelpers');
const cachePromises = {};
const tzc = require('timezonecomplete');
const { default: PQueue } = require('p-queue');

const SPREADSHEET_KEY = process.env.SPREADSHEET_KEY;
const SHEET_NAME = process.env.SHEET_NAME;
const RAISELY_TOKEN = process.env.RAISELY_TOKEN;
const CAMPAIGN_UUID = process.env.CAMPAIGN_UUID;
const WEBSITE_UUID = process.env.WEBSITE_UUID;
const WEBSITE_CAMPAIGN_PROFILE_UUID = process.env.WEBSITE_CAMPAIGN_PROFILE_UUID;

// Maximum concurrent requests to raisely
const MAX_REQUESTS = 3;

// Create a queue for our raisely promises so we don't flood raisely
const queue = new PQueue({ concurrency: MAX_REQUESTS });

const sgTime = tzc.zone('Asia/Singapore');

// We don't know the time, so set the date to YYYY-MM-dd 00:00 in SG time
const convertDate = (excelDate) => {
	const localDate = (new tzc.DateTime(new Date(1900, 0, --excelDate), tzc.DateFunctions.Get));
	const sgDate = new tzc.DateTime(localDate.format('YYYY-MM-dd HH:mm'), sgTime);
	sgDate.convert(tzc.TimeZone.utc());
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
	if (r && r.toLowerCase().includes("permanent")) return "Permanent Resident";
	return r;
}

async function raiselyRequest(opts) {
	opts.token = RAISELY_TOKEN;
	return queue.add(() => callRaisely(opts));
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
const upsertPerson = cachify(async (user, opts = {}) => {
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
		const updateKeys = ['private.residency', 'phoneNumber', 'private.gender', 'private.ethnicity', 'private.dateOfBirth', 'fullName', 'host', 'facilitate', 'volunteer', 'mailingList'];
		const toUpdate = {};
		let shouldUpdate;
		updateKeys.forEach(key => {
			const oldValue = _.get(userRecord, key);
			const newValue = _.get(user, key);
			if (newValue && (oldValue === null || oldValue === '')) {
				_.set(toUpdate, key, newValue);
				shouldUpdate = true;
			}
		});
		// Add recruiter record
		if (opts.recruiter) {
			['private.recruitedBy', 'private.pointPerson'].forEach(key => {
				if (!_.get(user, key)) {
					_.set(toUpdate, key, opts.recruiter)
					shouldUpdate = true;
				}
			});
		}
		// If email was just a place holder and we have a real one, replace it
		if (user.email && userRecord.email.endsWith('.invalid')) {
			toUpdate.email = userRecord.email;
			shouldUpdate = true;
		}

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
	if (!user.email) user.email = `no-email-${_.camelCase(user.fullName)}-${unique}@noemail.invalid`;

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
	let rsvp = allRsvps.find(r => _.get(r, 'event.private.legacyId') === details.legacyId);

	let existingEvent = _.get(rsvp, 'event');

	// Allow for events in the wrong timezone
	const wrongTimeZone = details.date.clone().add(8, tzc.TimeUnit.Hour);

	if (existingEvent) {
		const eventStartAt = new tzc.DateTime(existingEvent.startAt);
		if (eventStartAt.lessThan(details.date) || eventStartAt.greaterThan(wrongTimeZone)) {
			console.log(`Event ${existingEvent.name} marked with wrong legacy id, removing`);
			await raiselyRequest({
				path: `/events/${existingEvent.uuid}`,
				method: "PATCH",
				data: {
					private: {
						legacyId: null,
					},
				},
			});
			existingEvent = null;
		}
	}

	if (!existingEvent) {
		const matchingRsvp = allRsvps.find(
			(r) => {
				const eventStartAt = new tzc.DateTime(r.event.startAt);
				return eventStartAt.greaterEqual(details.date) && eventStartAt.lessEqual(wrongTimeZone);
			}
		);
		existingEvent = _.get(matchingRsvp, "event");
	}

	const privateValues = {
		reconciledBy: "(prior system)",
		reconciledAt: details.date.toIsoString(),
		reviewedBy: "(prior system)",
		reviewedAt: details.date.toIsoString(),
		status: "completed",
		conversationType: "private",
		isProcessed: true,
		legacyId: details.legacyId,
	};

	if (existingEvent) {
		console.log(`Found existing conversation ${existingEvent.uuid}`);

		const legacyId = _.get(existingEvent, "private.legacyId");
		if (legacyId && legacyId !==  details.legacyId) {
			throw new Error(`Conversation has wrong legacy ID (expected none or ${details.legacyId} got ${legacyId})`);
		}
		const toUpdate = { private: {}};
		const toSet = privateValues;
		if (existingEvent.startAt !== details.date.toIsoString()) {
			toUpdate.startAt = details.date.toIsoString();
		}
		// Set extra values only if they're not already set in the event
		Object.keys(toSet).forEach(key => {
			if (!existingEvent[key]) toUpdate.private[key] = toSet[key];
		});
		if (Object.keys(toUpdate).length) {
			// Set correct event start date
			await raiselyRequest({
				path: `/events/${existingEvent.uuid}`,
				method: "PATCH",
				data: toUpdate,
			});
		}
		return existingEvent;
	}

	console.log(`Creating conversation`);
	const conversation = await raiselyRequest({
		path: `/campaigns/${CAMPAIGN_UUID}/events`,
		method: "POST",
		data: {
			name: details.name,
			startAt: details.date.toIsoString(),
			userUuid: details.facilitator.uuid,
			isPrivate: true,
			private: privateValues,
		},
	});

	return conversation;
}, (details) => `conv-${details.host.uuid}-${details.date.toIsoString()}`);

const upsertFacilitatorProfile = cachify(async (user) => {
	let profiles = await raiselyRequest({
		path: `/users/${user.uuid}/profiles`,
		qs: {
			type: 'INDIVIDUAL',
			campaign: WEBSITE_UUID,
		},
	});
	if (profiles.length > 1) {
		console.log(profiles);
		throw new Error('Unexpected number of profiles')
	}
	let [profile] = profiles;
	if (profile) {
		if (profile.campaignUuid !== WEBSITE_UUID) {
			throw new Error('Profile found in wrong campaign');
		}
	} else {
		console.log(`No user profile for ${user.uuid}, creating`)
		profile = await raiselyRequest({
			path: `/profiles/${WEBSITE_CAMPAIGN_PROFILE_UUID}/members`,
			method: "POST",
			data: {
				userUuid: user.uuid,
				campaignUuid: WEBSITE_UUID,
				name: user.fullName || user.prefferedName,
				photoUrl: user.photoUrl,
				goal: 20000,
				currency: 'SGD',
			},
		});
	}
	return profile;
}, f => f.uuid);

/**
 * Upsert a cash donation, and associate a donation with the conversation if it should be
 */
async function upsertDonation({ conversation, guest, facilitator, cashDonation }) {
	// Find donations within 2 weeks of the conversation
	const twoWeeksLater = new tzc.DateTime(conversation.startAt).add(2, tzc.TimeUnit.Week);

	const donations = await raiselyRequest({
		path: "/donations",
		query: {
			user: guest.uuid,
			private: 1,
			campaign: WEBSITE_UUID,
			createdAtGTE: conversation.startAt,
			// Donation createdAt is not the same as when the donation
			// occurred at, so need to fetch all donations for the user
			// that occurred after the conversation
			// createdAtLTE: twoWeeksLater.toIsoString(),
		},
	});
	// Sort possible matches by earliest first, and filtering on those
	// that exactly match the amount
	const possibleMatches = _.sortBy(donations, d => d.createdAt)
		.filter(d => d.amount === cashDonation);

	const profile = await upsertFacilitatorProfile(facilitator);

	if (possibleMatches.length) {
		const exactMatch = possibleMatches.find(
			(d) => _.get(d, "private.conversationUuid") === conversation.uuid
		);

		let matchingDonation;

		if (exactMatch) {
			matchingDonation = exactMatch;
		} else {
			matchingDonation = possibleMatches[0];
			const conversationUuid = _.get(matchingDonation, "private.conversationUuid");
			// if (conversationUuid && conversationUuid !== conversation.uuid) {
			// 	throw new Error(`Donation has wrong conversation uuid. Expected none or ${conversation.uuid} got ${conversationUuid}`);
			// }
			// Note the matching conversation
			// if (!conversationUuid) {
				await raiselyRequest({
					path: `/donations/${matchingDonation.uuid}`,
					method: "PATCH",
					data: {
						private: {
							conversationUuid: conversation.uuid,
						},
					},
				});
			// }
		}

		// Move to correct facil profile if necessary
		if (matchingDonation.profileUuid !== profile.uuid) {
			await raiselyRequest({
				path: `/donations/${matchingDonation.uuid}/move`,
				method: "PATCH",
				data: { profileUuid: profile.uuid },
			});
		}

		// Associate the donation if it isn't already
		return matchingDonation;
	}

	// Create cash donation if one doesn't exist
	await raiselyRequest({
		path: `/profiles/${profile.uuid}/donations`,
		method: "POST",
		body: {
			data: {
				fullName: guest.fullName,
				preferredName: guest.preferredName,
				email: guest.email,
				anonymous: true,
				userUuid: guest.uuid,
				amount: cashDonation,
				mode: 'LIVE',
				type: 'OFFLINE',
				method: 'OFFLINE',

				currency: 'SGD',
				campaign: WEBSITE_UUID,
				private: {
					conversationUuid: conversation.uuid
				}
			},
		},
	});
}

const upsertInteraction = cachify(async (interaction) => {
	const interactions = await raiselyRequest({
		path: `/interactions`,
		query: {
			private: 1,
			user: interaction.userUuid,
			category: interaction.categoryUuid,
			limit: 100,
		},
	});
	const existing = interactions.find(i => i.recordUuid === interaction.recordUuid);
	if (existing) return existing;

	return raiselyRequest({
		method: 'POST',
		path: `/interactions`,
		body: {
			data: interaction,
		},
	});
}, i => `${i.userUuid} ${i.categoryUuid} ${i.recordUuid}`);

/**
 * @param {object} rsvp.conversation
 * @param {object} rsvp.guest
 */
const upsertRsvp = cachify(async (rsvp) => {
	const allRsvps = await raiselyRequest({
		path: `/event_rsvps`,
		query: {
			private: 1,
			user: rsvp.guest.uuid,
			type: rsvp.type,
			campaign: CAMPAIGN_UUID,
		},
	});
	// if (allRsvps[0]) {
	// 	console.log(`Exising RSVP for ${rsvp.type} found`);
	// 	return allRsvps[0];
	// }

	const rightRsvp = allRsvps.find(
		(r) => r.eventUuid === rsvp.conversation.uuid
	);
	if (rightRsvp) return rightRsvp;

	let wrongRsvp = allRsvps.find(r => !_.get(r, 'private.migrated'))
	if (wrongRsvp) {
		console.log("Found rsvp likely from wrong event, moving");

		await raiselyRequest({
			path: `/event_rsvps/${wrongRsvp.uuid}/move`,
			method: "PUT",
			data: {
				eventUuid: rsvp.conversation.uuid,
			},
		});

		await raiselyRequest({
			path: `/event_rsvps/${wrongRsvp.uuid}`,
			method: "PATCH",
			data: {
				private: {
					// Mark it having gone through the fixed migration so
					// we don't later mess with it if someone attended twice
					migrated: true,
				},
			},
		});

		return wrongRsvp;
	}

	console.log(`Creating RSVP for ${rsvp.type || 'guest'}`)

	return raiselyRequest({
		path: `/events/${rsvp.conversation.uuid}/rsvps`,
		method: 'POST',
		data: {
			userUuid: rsvp.guest.uuid,
			type: rsvp.type || 'guest',
			attended: true,
			private: {
				// Mark it having gone through the fixed migration so
				// we don't later mess with it if someone attended twice
				migrated: true,
			}
		}
	});
}, (rsvp) => `rsvp-${rsvp.conversation.uuid}-${rsvp.type || 'guest'}-${rsvp.guest.uuid}`);

/**
 *
 * @param {*} param0
 */
async function upsertSurvey({ interactionBase, row }) {
	return Promise.all([
		await upsertInteraction({
			...interactionBase,
			categoryUuid: "cc-pre-survey-2020",
			detail: {
				private: {
					societyPriority:
						row[
							"How high should society proritise climate change? Before"
						],
					talkativeness:
						row["Likely to have a conversation about CC? Before"],
					agency: row["Sense of Agency Before"],
					hope: row["Sense of Hope Before"],
				},
			},
		}),
		await upsertInteraction({
			...interactionBase,
			categoryUuid: "cc-post-survey-2020",
			detail: {
				private: {
					societyPriority:
						row[
							"How high should society proritise climate change? After"
						],
					talkativeness:
						row["Likely to have a conversation about CC? After"],
					recommend: row["Would you recommend CC? Score"],
					agency: row["Sense of Agency After"],
					hope: row["Sense of Hope After"],
					host: toBool(row["[Host]"]),
					facilitate: toBool(row["[Facilitate]"]),
					volunteer: toBool(row["[Volunteer]"]),
				},
			},
		}),
	]);
}

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
			if (header && headers.includes(header) || header === 'After') {
				let lastHeader = _.last(headers);
				if (lastHeader.endsWith('Before')) lastHeader = lastHeader.split('Before')[0].trim();
				if (lastHeader.endsWith("After"))
					lastHeader = lastHeader.split("After")[0].trim();
				header = lastHeader + ' ' + header;
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

	console.log(header)
	const limit = 100;
	let offset = process.env.OFFSET || 1;
	let row;

	while (offset <= worksheet.rowCount) {
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
	}
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

		const interactionBase = {
			recordUuid: conversation.uuid,
			recordType: "event",
			userUuid: guest.uuid
		};

		const promises = [
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
			upsertSurvey({
				interactionBase,
				conversation,
				guest,
				row
			}),
		];

		if (row['Cash Donation']) {
			promises.push(
				upsertDonation({
					conversation,
					guest,
					facilitator,
					cashDonation: row["Cash Donation"] * 100,
				})
			);
		}

		if (toBool(row["[Host]"])) {
			console.log('Adding host lead')
			promises.push(upsertInteraction({
				...interactionBase,
				categoryUuid: "host-interest",
				detail: {
					occurredAt: conversation.startAt,
					private: {
						facilitatorUuid: facilitator.uuid,
						status: "lead",
						source: "conversation",
						conversationUuid: conversation.uuid
					},
				}
			}));
		}

		await Promise.all(promises);
	});
}

syncConversations().catch(console.error);
