const fetch = require('node-fetch');
const dayjs = require('dayjs');

async function birthdayFundraiseReminder(req, res) {
	const token = process.env.APP_TOKEN;
	const today = dayjs().toISOString();

	// get users whose next birthday that have passed
	const usersBirthdayPassedUrl = `https://api.raisely.com/v3/users?private=true&private.nextBirthdayLTE=${today}`;
	const usersNextBirthdayAbsentUrl = `https://api.raisely.com/v3/users?private=1&private.nextBirthdayAbsent=1`;

	const usersBirthdayPassedResponse = await fetch(usersBirthdayPassedUrl, {
		headers: {
			'content-type': 'application/json',
			'User-Agent': 'Climate Conversations Proxy',
			'authorization': `Bearer ${token}`,
		},
		method: 'GET',
	});

	const usersBirthdayPassed = await usersBirthdayPassedResponse.json();

	if (usersBirthdayPassed.data.length == 0) {
		console.log('No users with birthdays found');
	}

	usersBirthdayPassed.data.forEach((user) => {
		const nextBirthdayCurrentValue = user.private.nextBirthday;
		const userid = user.uuid;
		const nextBirthdayUpdateValue = dayjs(nextBirthdayCurrentValue)
			.add(1, 'year')
			.toISOString();

		// patch request to update next birthday
		const options = {
			method: 'PATCH',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
				'authorization': `Bearer ${token}`,
			},
			body: JSON.stringify({
				data: { private: { nextBirthday: nextBirthdayUpdateValue } },
			}),
		};

		fetch(`https://api.raisely.com/v3/users/${userid}`, options)
			.then((response) => response.json())
			.then((response) => console.log(response))
			.catch((err) => console.error(err));
	});

	// TODO:
	// request to grab users with empty next birthday data + birthday is present
	// to update next birthday

	const usersNextBirthdayAbsentResponse = await fetch(
		usersNextBirthdayAbsentUrl,
		{
			headers: {
				'content-type': 'application/json',
				'User-Agent': 'Climate Conversations Proxy',
				'authorization': `Bearer ${token}`,
			},
			method: 'GET',
		}
	);

	const usersBirthdayAbsent = await usersNextBirthdayAbsentResponse.json();

	console.log(usersBirthdayAbsent);

	if (usersBirthdayAbsent.data.length == 0) {
		console.log('No users with absent next birthdays found');
	}

	usersBirthdayAbsent.data.forEach((user) => {
		const currentBirthday = user.private.DateOfBirth;
		const currentYear = dayjs().get('year');
		const userid = user.uuid;
		const nextBirthdayUpdateValue = dayjs(currentBirthday)
			.set('year', currentYear)
			.toISOString();

		// patch request to update next birthday
		const options = {
			method: 'PATCH',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
				'authorization': `Bearer ${token}`,
			},
			body: JSON.stringify({
				data: { private: { nextBirthday: nextBirthdayUpdateValue } },
			}),
		};

		fetch(`https://api.raisely.com/v3/users/${userid}`, options)
			.then((response) => response.json())
			.then((response) => console.log(response))
			.catch((err) => console.error(err));
	});

	res.status(200);
}

module.exports = { birthdayFundraiseReminder };
