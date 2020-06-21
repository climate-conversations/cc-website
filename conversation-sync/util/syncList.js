const _ = require('lodash');

require('../config');

const MailchimpController = require('../src/controllers/Mailchimp');
const { raiselyRequest } = require('../src/helpers/raiselyHelpers');

const CONCURRENCY=5;

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

		for (let i = 0; i < records.length; i++) {
			const promise = callback(records[i], i + offset).catch(err => error = err);
			promises.push(promise);
			promise.then(() => {
				_.remove(promises, x => x === promise);
			});

			if (promises.length > CONCURRENCY) await Promise.race(promises);
			if (error) throw error;
		}
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
			console.log('Recurring donor has already been added, nothing to do');
			return;
		}
		donorUuids.push(donation.user.uuid);
		const data = {
			type: 'donation.created',
			data: donation,
		}
		console.log(`**** Syncing donor ${i} ${donation.user.uuid} ${donation.email} ****`);
		return controller.process({ data });
	});
}

async function syncRaiselyToMailchimp() {
	return paginateRaisely('/users?private=1', async (user, i) => {
		const data = {
			type: 'user.updated',
			data: user,
		}
		if (user.email !== 'hills.gemma@gmail.com') return;
		console.log(`**** Syncing person ${i} ${user.uuid} ${user.email} ****`);
		return controller.process({ data });
	});
}

async function doAll() {
	// await syncRaiselyDonorsToMailchimp();
	await syncRaiselyToMailchimp();
}

doAll().catch(console.error);
