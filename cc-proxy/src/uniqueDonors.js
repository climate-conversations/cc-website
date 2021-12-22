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

	// get all donations to profile
	try {
		console.log('trying request now');
		let donationData = await raisely(
			{
				method: 'GET',
				path: `/donations?campaign=${campaignUuid}&profile=${uuid}`,
				query: { private: 1 },
				escalate: true,
			},
			req
		);

		// list of objects. each object is a donation
		console.log('success!: ' + JSON.stringify(donationData.data));

		// TODO:
		// 1. exclude donations from same email address (no email address in)
		// 2. self donation (same email address)

		const totalDonationsToProfile = donationData.data.length;

		let patchProfileDonorCount = await raisely(
			{
				method: 'PATCH',
				path: `/profiles/${uuid}?campaign=${campaignUuid}`,
				body: {
					data: {
						public: {
							uniqueDonors: totalDonationsToProfile,
						},
					},
					overwriteCustomFields: true,
				},
				escalate: true,
			},
			req
		);
	} catch (error) {
		console.log('unable to fetch all donations');
		console.log(error.error);
	}
	return {
		status: 200,
	};
}

module.exports = { uniqueDonors };
