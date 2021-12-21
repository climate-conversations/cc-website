const RestError = require('./restError');
const { authorize, getTagsAndRoles } = require('./proxy/permissions');
const raisely = require('./raiselyRequest');

/**
 * Get unique donors for each fundraiser
 *
 * @param {*} req
 */

// to trigger when a donation succeeded.
// should trigger when it succeeded or deleted
async function uniqueDonors(req) {

	let { campaignUuid } = req.body.data.data;
	let { uuid } = req.body.data.data.profile;

	// get all donations to profile
	try {
		console.log("trying request now")
		let donationData = await raisely(
			{
				method: 'GET',
				path: `/donations?campaign=${campaignUuid}&profile=${uuid}`,
			},
			req
		)

		// list of objects. each object is a donation
		// console.log("success!" + JSON.stringify(donationData.data))

		// who is cadence?
// 1. exclude donations from same email address
// 2. self donation (how to check that?)

		const totalDonationsToProfile = donationData.data.length
		console.log("total Donations: ", totalDonationsToProfile)
	} catch {
		console.log("unable to fetch all donations")
	}
	return {
		status: 200,
	};
}

module.exports = { uniqueDonors };

