const fetch = require('node-fetch');
const dayjs = require('dayjs');

const checkBirthdayPassed = (dateOfBirth) => {
	let currentYear = dayjs().year();
	let birthday = dayjs(dateOfBirth)
		.set('year', currentYear)
		.toISOString();

	return dayjs().diff(birthday) > 0;
};
async function birthdayFundraiseReminder(req, res) {
	const token = process.env.APP_TOKEN;
	let today = new Date().toISOString();

	// get users whose next birthday that have passed
	const usersBirthdayPassedUrl = `https://api.raisely.com/v3/users?private=true&private.nextBirthdayLTE=${today}`;

	const usersBirthdayPassedResponse = await fetch(usersBirthdayPassedUrl, {
		headers: {
			'content-type': 'application/json',
			'User-Agent': 'Climate Conversations Proxy',
			'authorization': `Bearer ${token}`,
		},
		method: 'GET',
	});

	const usersBirthdayPassed = await usersBirthdayPassedResponse.json();

	usersBirthdayPassed.forEach((user) => {
		// update next birthday
		const nextBirthday = user.private.nextBirthday;
		const userid = user.uuid;
	});

	// TODO:
	// request to grab users with empty next birthday data + birthday is present
	// to update next birthday

	res.status(200);
}

module.exports = { birthdayFundraiseReminder };

// nextBirthdayAt:
// cloud function to check the current birthday field and update the nextBirthdayAt, make sure that it is always up to date
// update nextBirthdayAt after their birthday has past, trigger function weekly
// tricky part -> finding  empty records, raisely does not support
// need to account for first time users where their birthday has not passed this year ->
