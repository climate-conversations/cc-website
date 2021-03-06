const fetch = require('node-fetch');
const dayjs = require('dayjs');

async function birthdayFundraiseReminder(req, res) {
	const token = process.env.APP_TOKEN;
	const today = dayjs().toISOString();
	var nextBirthdayUpdated = [];
	var nextBirthdayPassedUpdated = [];

	// get users whose next birthday that have passed
	const usersBirthdayPassedUrl = `https://api.raisely.com/v3/users?private=true&private.nextBirthdayLTE=${today}`;
	const usersNextBirthdayAbsentUrl = `https://api.raisely.com/v3/users?private=1&nextBirthdayAbsent=1&dateOfBirthPresent=1`;

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

	if (usersBirthdayAbsent.data.length == 0) {
		console.log('No users with absent next birthdays found');
	}

	// remove invalid birthdays
	const usersBirthdayAbsentValidated = usersBirthdayAbsent.data.filter(
		(user) => dayjs(user.private.dateOfBirth).isValid()
	);

	usersBirthdayAbsentValidated.forEach((user) => {
		const currentBirthday = user.private.dateOfBirth;
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
			.then((response) => nextBirthdayUpdated.push(response))
			.catch((err) => console.error(err));
	});

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

	const usersBirthdayPassedValidated = usersBirthdayPassed.data.filter(
		(user) => dayjs(user.private.nextBirthday).isValid()
	);

	usersBirthdayPassedValidated.forEach((user) => {
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
			.then((response) => nextBirthdayPassedUpdated.push(response))
			.catch((err) => console.error(err));
	});

	res.status(200).send({ nextBirthdayUpdated, nextBirthdayPassedUpdated });
}

module.exports = { birthdayFundraiseReminder };
