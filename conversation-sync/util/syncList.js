const _ = require('lodash');
const pMap = require('p-map');

require('../config');

const MailchimpController = require('../src/controllers/Mailchimp');
const { raiselyRequest } = require('../src/helpers/raiselyHelpers');

const CONCURRENCY = 2;

const controller = new MailchimpController({
	log: console.log,
});

async function paginateRaisely(url, callback) {
	const limit = parseInt(process.env.LIMIT) || 100;
	let offset = parseInt(process.env.OFFSET) || 0;
	let next;

	const promises = [];
	let error;

	// Fetch raisely users
	do {
		console.log('Fetching records from raisely ...');
		const body = await raiselyRequest({
			path: next || `${url}&limit=${limit}&offset=${offset}`,
			fullResult: true,
			token: process.env.RAISELY_TOKEN,
		});

		next = body.pagination.nextUrl;
		const records = body.data;
		console.log('nextUrl will be', next);

		await pMap(
			records,
			async (record, i) => {
				if (error) return;
				try {
					await callback(records[i], i + offset);
				} catch (e) {
					console.log(e);
					error = e;
				}
			},
			{ concurrency: CONCURRENCY }
		);
		offset += limit;

		if (error) throw error;
	} while (next);
	await Promise.all(promises);
	if (error) throw error;
}

async function syncRaiselyDonorsToMailchimp() {
	let donorUuids = [];

	return paginateRaisely('/donations?private=1', async (donation, i) => {
		if (donation.mode === 'TEST') return;
		if (donorUuids.includes(donation.user.uuid)) {
			console.log(
				'Recurring donor has already been added, nothing to do'
			);
			return;
		}
		donorUuids.push(donation.user.uuid);
		const data = {
			type: 'donation.created',
			data: donation,
		};
		console.log(
			`**** Syncing donor ${i} ${donation.user.uuid} ${donation.email} ****`
		);
		return controller.process({ data });
	});
}

async function syncRaiselyToMailchimp() {
	return paginateRaisely('/users?private=1', async (user, i) => {
		const data = {
			type: 'user.updated',
			data: user,
		};
		console.log(`**** Syncing person ${i} ${user.uuid} ${user.email} ****`);
		await controller.process({ data });
		await controller.process({
			data: {
				type: 'donation.updated',
				data: { user },
			},
		});
	});
}

async function doAll() {
	await syncRaiselyDonorsToMailchimp();
	// await syncRaiselyToMailchimp();
}

doAll().catch(console.error);
