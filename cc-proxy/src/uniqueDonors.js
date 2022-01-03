const RestError = require('./restError');
const { authorize, getTagsAndRoles } = require('./proxy/permissions');
const raisely = require('./raiselyRequest');

/**
 * Get unique donors for each fundraiser
 *
 * @param {*} req
 */

// to trigger when a donation succeeded.
async function uniqueDonors(req) {
	let { campaignUuid } = req.body.data.data;
	let { uuid } = req.body.data.data.profile;

	try {
		// get all donations to profile
		let allDonations = await raisely(
			{
				method: 'GET',
				path: `/donations?campaign=${campaignUuid}&profile=${uuid}`,
				query: { private: 1 },
				escalate: true,
			},
			req
		);

		let profileUserEmail = allDonations[0].user.email;
		let allEmails = allDonations.map((donations) => donations.email);
		let uniqueEmails = Array.from(new Set(allEmails));
		let countedEmails = uniqueEmails.filter(
			(email) => email !== profileUserEmail
		);

		let patchProfileDonorCount = await raisely(
			{
				method: 'PATCH',
				path: `/profiles/${uuid}`,
				body: {
					data: {
						public: {
							uniqueDonors: countedEmails.length,
						},
					},
					overwriteCustomFields: true,
				},
				escalate: true,
			},
			req
		);
	} catch (error) {
		console.log('unable to update donations');
		console.log(error.error);
	}
	return {
		status: 200,
	};
}

module.exports = { uniqueDonors };
