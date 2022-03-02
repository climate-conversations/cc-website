const fetch = require('node-fetch');
const dayjs = require('dayjs');

const daysAfterBirthday = 7; // set birthday time range to 7 days
const checkBirthdayPassed = (dateOfBirth) => {
	let currentYear = dayjs().year();
	let birthday = dayjs(dateOfBirth)
		.set('year', currentYear)
		.toISOString();

	return dayjs().diff(birthday) > 0;
};
async function birthdayFundraiseReminder(req, res) {
	const token = process.env.APP_TOKEN;
	const usersUrl = 'https://api.raisely.com/v3/users?private=true';

	const allUsersResponse = await fetch(usersUrl, {
		headers: {
			'content-type': 'application/json',
			'User-Agent': 'Climate Conversations Proxy',
			'authorization': `Bearer ${token}`,
		},
		method: 'GET',
	});

	const allUsers = await allUsersResponse.json();

	console.log('number of users: ', allUsers.data.length);
	// console.log('look here: ', dayjs().diff('2022-01-06T16:00:00.000Z'));
	let usersBirthdayInfo = [];
	allUsers.data.forEach((user) => {
		if (user?.private?.dateOfBirth) {
			usersBirthdayInfo.push({
				uuid: user.uuid,
				dateOfBirth: user?.private?.dateOfBirth,
				nextBirthday: user?.private?.nextBirthday,
			});
		}
	});

	console.log(usersBirthdayInfo);

	// loop through the array
	usersBirthdayInfo.forEach((userBirthdayInfo) => {
		// check if dateofbirth is a proper date
		if (typeof userBirthdayInfo.dateOfBirth !== 'string') return;

		if (userBirthdayInfo.nextBirthday) {
			// if next birthday is defined -> check whether birthday has passed
			// if passed, update next birthday with next year, else do nothing
		} else {
			// if next birthday is undefined -> check current birthday has passed.

			if (checkBirthdayPassed(userBirthdayInfo.dateOfBirth)) {
				console.log('date of birth is: ', dateOfBirth);
				console.log('birthday has passed, updating next birthday');
			} else {
				console.log('birthday not passed, do nothing');
			}
			// if passed, update next birthday with next year, else update next birthday with current year
		}
	});
	res.status(200);
}

module.exports = { birthdayFundraiseReminder };

// nextBirthdayAt:
// cloud function to check the current birthday field and update the nextBirthdayAt, make sure that it is always up to date
// update nextBirthdayAt after their birthday has past, trigger function weekly
// tricky part -> finding  empty records, raisely does not support
// need to account for first time users where their birthday has not passed this year ->
