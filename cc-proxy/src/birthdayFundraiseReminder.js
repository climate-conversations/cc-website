const fetch = require('node-fetch');
const dayjs = require('dayjs');

const daysAfterBirthday = 7; // set birthday time range to 7 days

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
	let userBirthdayInfo = [];
	allUsers.data.forEach((user) => {
		if (user?.private?.dateOfBirth) {
			userBirthdayInfo.push({
				uuid: user.uuid,
				dateOfBirth: user?.private?.dateOfBirth,
				nextBirthday: user?.private?.nextBirthday,
			});
		}
	});

	console.log(userBirthdayInfo);

	// loop through the array

	// check if dateofbirth is a proper date
	// if next birthday is undefined -> check current birthday has passed.
	// if passed, update next birthday with next year, else update next birthday with current year
	// if next birthday is defined -> check whether birthday has passed
	// if passed, update next birthday with next year, else do nothing

	res.status(200);
}

module.exports = { birthdayFundraiseReminder };

// nextBirthdayAt:
// cloud function to check the current birthday field and update the nextBirthdayAt, make sure that it is always up to date
// update nextBirthdayAt after their birthday has past, trigger function weekly
// tricky part -> finding  empty records, raisely does not support
// need to account for first time users where their birthday has not passed this year ->
