require('../config');

const MailchimpController = require('../src/controllers/Mailchimp');
const { raiselyRequest } = require('../src/helpers/raiselyHelpers');

async function syncRaiselyToMailchimp() {
	const controller = new MailchimpController({
		log: console.log,
	});

	let next;

	// Fetch raisely users
	do {
		const body = await raiselyRequest({
			path: next || '/users?private=1&limit=1000',
			fullResult: true,
		});

		next = body.pagination.nextUrl;
		const users = body.data;
		console.log('nextUrl will be', next);

		for (let i = 0; i < users.length; i++) {
			const user = users[i];
			// if (user.uuid === 'faa837cd-2daa-11ea-a257-37bf76a80e6a') {
			// 	console.log(user.email)
			// 	throw new Error('found')

			const data = {
				type: 'user.updated',
				data: user,
			}
			console.log('Syncing person ', user.uuid);
			await controller.process({ data });
		}

	} while (next);
}

syncRaiselyToMailchimp()
	.catch(console.error);
