require('../config');

const MailchimpController = require('../src/controllers/Mailchimp');
const { raiselyRequest } = require('../src/helpers/raiselyHelpers');

async function syncRaiselyToMailchimp() {
	const controller = new MailchimpController({
		log: console.log,
	});

	const limit = 100;
	let offset = parseInt(process.env.OFFSET) || 0;
	let next;

	// Fetch raisely users
	do {
		console.log('Fetching records from raisely ...');
		const body = await raiselyRequest({
			path: next || `/users?private=1&limit=${limit}&offset=${offset}`,
			fullResult: true,
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
			await controller.process({ data });
		}
		offset += limit;

	} while (next);
}

syncRaiselyToMailchimp()
	.catch(console.error);
