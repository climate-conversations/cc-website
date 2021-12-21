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
			},
			req
		);

		// list of objects. each object is a donation
		// console.log("success!" + JSON.stringify(donationData.data))

		// TODO:
		// who is cadence?
		// donation amount seems to be wrong
		// 1. exclude donations from same email address (no email address in)
		// 2. self donation (how to check that?)

		const totalDonationsToProfile = donationData.data.length;
		console.log('total Donations: ', totalDonationsToProfile);

		// 3.update donorCount in profile with patch request
		// https://developers.raisely.com/reference#patch_profiles-path
		// data.public.uniqueDonors

		// patch request is not working
		let patchProfileDonorCount = await raisely(
			{
				method: 'PATCH',
				path: `/profiles/${uuid}?partial=true`,
				body: {
					data: {
						public: {
							uniqueDonors: totalDonationsToProfile.toString(),
						},
					},
					overwriteCustomFields: true
				},
			},
			req
		);

		console.log('patched');

		let profile = await raisely(
			{
				method: 'GET',
				path: `/profiles/${uuid}`,
			},
			req
		);

		console.log(profile.data.public);
	} catch {
		console.log('unable to fetch all donations');
	}
	return {
		status: 200,
	};
}

module.exports = { uniqueDonors };
