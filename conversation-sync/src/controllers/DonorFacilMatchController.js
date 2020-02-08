/* eslint-disable class-methods-use-this */
const { AirblastController } = require('airblast');
const _ = require('lodash');
const tzc = require('timezonecomplete');

const { fetchTeam } = require('../helpers/raiselyConversationHelpers');
const { raiselyRequest } = require('../helpers/raiselyHelpers');

const options = {
	wrapInData: true,
};

// Attribute a donation to a facilitator if it
// occurs within X days of the guest attending their
// conversation
const ATTRIBUTION_WINDOW = new tzc.Duration(14, tzc.TimeUnit.Day);

class DonorFacilMatch extends AirblastController {
	async process({ data }) {
		const { WEBSITE_PATH, PORTAL_PATH } = process.env;

		if (!['donation.created', 'donation.succeeded'].includes(data.type)) throw new Error(`Unrecognised event ${data.type}`);

		const donation = data.data;

		if (!donation || !donation.uuid) {
			throw new Error("Donation has no uuid, something's gone wrong.");
		}

		if (donation.profile.path !== WEBSITE_PATH) {
			this.log(`${donation.uuid} Donation is already assigned a profile, not moving`);
			return;
		}

		const eventWindow = tzc.DateTime.nowUtc().sub(ATTRIBUTION_WINDOW).format('yyyy-MM-dd');

		const rsvps = await raiselyRequest({
			path: '/eventRsvps',
			qs: {
				campaign: PORTAL_PATH,
				startAtGTE: eventWindow,
				'user.email': donation.email,
			},
			token: process.env.RAISELY_TOKEN,
		});
		if (rsvps.length) {
			// On the off chance they have multiple, try and find the first rsvp with an
			// unfulfilled donation intention
			// Or just go with the first if not
			const rsvp = rsvps.find(r =>
					((_.get(r, 'private.donationIntention', 'no') !== 'no') &&
					(!_.get(r, 'private.donationUuid')))) || rsvps[0];

			await Promise.all([
				this.assignToFacilitator(rsvp, donation),
				this.markFulfilled(rsvp, donation),
			]);
		} else {
			this.log(`${donation.uuid} No matching conversation rsvp found, not moving`);
		}
	}

	async markFulfilled(rsvp, donation) {
		return raiselyRequest({
			path: `/eventRsvps/${rsvp.uuid}`,
			method: 'PATCH',
			body: {
				partial: true,
				data: {
					private: { donationUuid: donation.uuid },
				},
			},
			token: process.env.RAISELY_TOKEN,
		});
	}

	async assignToFacilitator(rsvp, donation) {
		const { facilitator } = await fetchTeam(rsvp.eventUuid);

		// Get Facilitor for event
		const profile = await this.upsertProfile(facilitator);

		// Assign donation to facilitator profile
		return raiselyRequest({
			path: `/donations/${donation.uuid}/move`,
			method: 'PATCH',
			data: { profileUuid: profile.uuid },
			token: process.env.RAISELY_TOKEN,
		})
	}

	async upsertProfile(user) {
		const { WEBSITE_PATH } = process.env;

		let [profile] = await raiselyRequest({
			path: `/users/${user.uuid}/profiles`,
			qs: {
				type: 'INDIVIDUAL',
			},
			token: process.env.RAISELY_TOKEN,
		});
		if (!profile) {
			this.log(`No user profile for ${user.uuid}, creating`)
			profile = await raiselyRequest({
				path: `/campaigns/${WEBSITE_PATH}/profiles`,
				method: 'POST',
				data: {
					userUuid: user.uuid,
					name: user.fullName || user.prefferedName,
					photoUrl: user.photoUrl,
					goal: 20000,
				},
				token: process.env.RAISELY_TOKEN,
			});
		}
		return profile;
	}
}

DonorFacilMatch.options = options;

module.exports = DonorFacilMatch;
