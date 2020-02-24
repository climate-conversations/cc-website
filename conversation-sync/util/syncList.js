const _ = require('lodash');

require('../config');

const MailchimpController = require('../src/controllers/Mailchimp');
const { raiselyRequest } = require('../src/helpers/raiselyHelpers');

const CONCURRENCY=10;

async function syncRaiselyToMailchimp() {
	const controller = new MailchimpController({
		log: console.log,
	});

	const limit = 100;
	let offset = parseInt(process.env.OFFSET) || 0;
	let next;

	const promises = [];
	let error;

	// Fetch raisely users
	do {
		console.log('Fetching records from raisely ...');
		const body = await raiselyRequest({
			path: next || `/users?private=1&limit=${limit}&offset=${offset}`,
			fullResult: true,
			token: process.env.RAISELY_TOKEN,
		});

		next = body.pagination.nextUrl;
		const users = body.data;
		console.log('nextUrl will be', next);

		for (let i = 0; i < users.length; i++) {
			const user = users[i];

			const data = {
				type: 'user.updated',
				data: user,
			}
			console.log(`**** Syncing person ${i + offset} ${user.uuid} ${user.email} ****`);
			const promise = controller.process({ data }).catch(err => error = err);
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
	if (error) throw error;
}

syncRaiselyToMailchimp()
	.catch(console.error);
