const fetch = require('node-fetch');
const dayjs = require('dayjs');

const daysAfterBirthday = 7; // set birthday time range to 7 days

async function birthdayFundraiseReminder(req, res) {
	const token = process.env.APP_TOKEN;
	const fundraiseUuid = process.env.FUNDRAISE_UUID;
	const birthdayTriggerUrl = `https://communications.raisely.com/v1/triggers/${fundraiseUuid}`;
	const usersBirthdayUrl = 'https://api.raisely.com/v3/users';

	const triggerResponse = await fetch(birthdayTriggerUrl, {
		headers: {
			'content-type': 'application/json',
			'User-Agent': 'Climate Conversations Proxy',
			'authorization': `Bearer raisely:${token}`,
		},
		method: 'GET',
	});

	const trigger = await triggerResponse.json();
	const intervalData = trigger.data.condition[1].value;
	const numberOfMonths = intervalData.split(' ')[0];

	let birthdayRangeStart = dayjs()
		.add(numberOfMonths, 'months')
		.toISOString();
	const birthdayRangeEnd = dayjs(birthdayRangeStart)
		.add(daysAfterBirthday, 'days')
		.toISOString();

	console.log(birthdayRangeStart);
	console.log(birthdayRangeEnd);

	let queryParams = {
		'private.dateOfBirthLT': '2002-12-11T16:00:00.000Z',
		'private.dateOfBirthGTE': ' 2002-06-07T16:00:00.000Z',
		'private': 1,
	};

	const userResponse = await fetch(
		usersBirthdayUrl + '?' + new URLSearchParams(queryParams),
		{
			headers: {
				'content-type': 'application/json',
				'User-Agent': 'Climate Conversations Proxy',
				'authorization': `Bearer ${token}`,
			},
			method: 'GET',
		}
	);

	const users = await userResponse.json();

	console.log('interval Data', intervalData);
	console.log('total number of users:', users.data.length);

	// TODO: skip null, [anonymised] users and empty strings
	if (users.data.length > 0) {
		users.data.forEach((user) => {
			// just test a name
			if (user.preferredName == 'crystle') {
				console.log(user);

				const testing = fetch(
					'https://communications.raisely.com/v1/events',
					{
						type: 'custom',
						source: `39cc6df0-4838-11ec-9af8-b786e9ac2af4`, //campaignuuid for "Fundraise for Climate Conversations [Staging]"
						data: {
							custom: {
								birthday: intervalData, // 3 months
								type: 'birthday',
							},
							user,
						},
					}
				).then(console.log);
			}
		});
	}
	res.status(200);
}

module.exports = { birthdayFundraiseReminder };

// if (users.length) {
// 	users.forEach(user =>
// 	await request('https://communications.raisely.com/v1/events', {
// 		type: 'custom',
// 		source: `campaign:`, //campaignuuid need to check this
// 		version: 1,
// 		data: {
// 			custom: {
// 				birthday: interval,
// 				type: 'birthday'
// 			},
// 			user,
// 		}
// 	}));
// }
