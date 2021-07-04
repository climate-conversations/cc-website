
require('dotenv').config();

const _ = require('lodash');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { raiselyRequest: callRaisely } = require('../src/helpers/raiselyHelpers');
const pMap = require('p-map');
const { default: PQueue } = require('p-queue');
const pThrottle = require('p-throttle');

const SPREADSHEET_KEY = process.env.EXPORT_SPREADSHEET_KEY;
const SHEET_NAME = process.env.EXPORT_SHEET_NAME;
const RAISELY_TOKEN = process.env.RAISELY_TOKEN;
const CAMPAIGN_UUID = process.env.CAMPAIGN_UUID;

const queue = new PQueue({ concurrency: 1 });

async function raiselyRequest(opts) {
	opts.token = RAISELY_TOKEN;
	return callRaisely(opts);
}

let worksheet;

async function forAllHosts(callback) {
	console.log('Loading all hosts and conversations');
	const hostRsvps = await raiselyRequest({
		path: '/event_rsvps',
		query: {
			type: 'host',
			private: 1,
			campaign: CAMPAIGN_UUID,
			limit: 200,
		},
	});
	const hosts = {};
	const hostsToConversations = {};
	const conversationsToHosts = {};
	hostRsvps.forEach(rsvp => {
		if (!hostsToConversations[rsvp.userUuid]) hostsToConversations[rsvp.userUuid] = [];
		hostsToConversations[rsvp.userUuid].push(rsvp.event);
		if (!hosts[rsvp.userUuid]) hosts[rsvp.userUuid] = rsvp.user;
		if (!conversationsToHosts[rsvp.eventUuid]) conversationsToHosts[rsvp.eventUuid] = [];
		conversationsToHosts[rsvp.eventUuid].push(rsvp.user);
	});
	const orderedHosts = Object.values(hosts).sort((a, b) => {
		const aConv = _.first(hostsToConversations[a.uuid]);
		const bConv = _.first(hostsToConversations[b.uuid]);
		return aConv.startAt < bConv.startAt ? -1 : 1;
	});
	await pMap(orderedHosts, (host, index) => {
		return callback(host, hostsToConversations[host.uuid], index);
	}, { concurrency: 1 });
}

function toRow(user = {}, facilitator = {}, count = 1) {
	return {
		'Raisely ID': user.uuid,
		'Preferred Name': user.preferredName,
		'Full Name': user.fullName,
		'Resident': _.get(user, 'private.residency'),
		'Email': user.email && !user.email.endsWith('.invalid') ? user.email : null,
		'Phone Number': user.phoneNumber && `'${user.phoneNumber}`,
		'Attendee Count': count,
		'Facilitator Full Name': facilitator.fullName,
		'Facilitator Preferred Name': facilitator.preferredName,
	};
}

const insertRow = pThrottle(async function(user, facilitator, count) {
	await worksheet.addRow(toRow(user, facilitator, count));
	// Google rate limits us to 100 requests every 100s
	// So send 14 reqs every 15s to give us some breathing room
	// and ensure we don't exhaust our limit in the first 10s
}, 14, 15 * 1000);

async function prepareSheet() {
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

	if (process.env.SET_HEADER) {
		// Make a blank row and use it's keys to set the header
		await worksheet.setHeaderRow(Object.keys(toRow()));
	}
	return worksheet;
}

async function syncActivationList() {
	worksheet = await prepareSheet();
	await forAllHosts(async (host, conversations, hostIndex) => {
		console.log(`= (${hostIndex}) Host ${host.fullName}`)
		let hostGuestCount = 0;
		let facilitator;

		await pMap(conversations, async (conversation, index) => {
			console.log(`=== Conversation ${conversation.name}`)
			const conversationType = _.get(conversation, 'private.conversationType', 'private').toLowerCase();
			const [guests, facilitators] = await Promise.all([
				raiselyRequest({
					path: `/events/${conversation.uuid}/rsvps`,
					query: {
						private: 1,
						type: 'guest',
					},
				}),
				raiselyRequest({
					path: `/events/${conversation.uuid}/rsvps`,
					query: {
						private: 1,
						type: 'facilitator',
					},
				}),
			]);
			if (conversationType === 'private') {
				hostGuestCount += guests.length;
				// If there's more than one facilitator, round robin
				facilitator = facilitators[index % facilitators.length];
			} else {
				guests.forEach(guest => {
					console.log(`Inserting individual guest: ${guest.user.email}`);
					// If there's more than one facilitator, round robin
					facilitator = facilitators[index % facilitators.length];
					queue.add(() => insertRow(guest.user, facilitator.user, 1));
				});
			}
		}, { concurrency: 1 });

		if (hostGuestCount) {
			console.log(`Inserting host entry: ${host.email}`);
			queue.add(() => insertRow(host, facilitator.user, hostGuestCount));
		}
		// Don't let the queue get away from us
		if (queue.size > 2) {
			console.log('Waiting on queue to clear ...');
			await queue.onEmpty();
		}
	});
	await queue.onEmpty();
}

syncActivationList().catch(console.error);
