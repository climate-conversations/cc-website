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

	if (!campaignUuid) {
		throw new RestError({
			message: 'Request malformed. CampaignUuid does not exist',
			status: 400,
		});
	}

	if (!uuid) {
		throw new RestError({
			message: 'Request malformed. ProfileUuid does not exist',
			status: 400,
		});
	}

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

	let profileUserEmail = allDonations.data[0].user.email;
	let allEmails = allDonations.data.map((donations) => donations.email);
	let uniqueEmails = Array.from(new Set(allEmails));
	let countedEmails = uniqueEmails.filter(
		(email) => email !== profileUserEmail
	);

	try {
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
				},
				escalate: true,
			},
			req
		);

		return {
			status: 200,
		};
	} catch (error) {
		const statusCode = error.status || error.statusCode || 500;
		console.error(
			`Patch request failed with status ${statusCode}:`,
			error.error || error.message
		);
		return {
			status: statusCode,
		};
	}
}

module.exports = { uniqueDonors };
