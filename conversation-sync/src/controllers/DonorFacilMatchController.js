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
const ATTRIBUTION_WINDOW = new tzc.Duration(14, 'days');

class DonorFacilMatch extends AirblastController {
	async process({ data }) {
		const { WEBSITE_PATH, PORTAL_PATH } = process.env;

		if (data.type !== 'donation.created') throw new Error(`Unrecognised event ${data.type}`);

		const donation = data.data;

		if (!donation || !donation.uuid) {
			throw new Error("Donation has no uuid, something's gone wrong.");
		}

		if (donation.profile.path !== WEBSITE_PATH) {
			this.log(`${donation.uuid} Donation is already assigned a profile, not moving`);
			return;
		}

		const eventWindow = new tzc.DateTime().subLocal(ATTRIBUTION_WINDOW).toIsoString();

		const rsvps = await raiselyRequest({
			path: '/eventRsvps',
			qs: {
				campaign: PORTAL_PATH,
				startAtGTE: eventWindow,
				'user.email': donation.email,
			},
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
		})
	}

	async upsertProfile(user) {
		const { WEBSITE_PATH } = process.env;

		let [profile] = await raiselyRequest({
			path: `/users/${user.uuid}/profiles`,
			qs: {
				type: 'INDIVIDUAL',
			},
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
			});
		}
		return profile;
	}
}

DonorFacilMatch.options = options;

module.exports = DonorFacilMatch;
