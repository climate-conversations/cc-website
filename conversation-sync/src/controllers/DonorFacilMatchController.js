/* eslint-disable class-methods-use-this */
const { AirblastController } = require('airblast');
const _ = require('lodash');
const tzc = require('timezonecomplete');

/**
 * This will take webhooks for created donations and assign them
 * to the profile of the facilitator that conducted the conversation
 *
 * If the facilitator doesn't have a profile on the CC website campaign
 * one will be created
 */

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
		const { WEBSITE_PATH, PORTAL_PATH, PORTAL_UUID } = process.env;

		if (!['donation.created'].includes(data.type)) throw new Error(`Unrecognised event ${data.type}`);

		const donation = data.data;

		if (!donation || !donation.uuid) {
			throw new Error("Donation has no uuid, something's gone wrong.");
		}

		const unassigned = (donation.profile.path === WEBSITE_PATH) || (donation.campaignUuid === PORTAL_UUID);

		if (!unassigned) {
			this.log(`${donation.uuid} Donation is already assigned a profile, not moving`);
			return;
		}

		// If it's an offline donation from the portal, it's already assigned to
		// the event, so just need to move it over to the website campaign
		if (donation.campaignUuid === PORTAL_UUID) {
			const facilitatorProfile = await raiselyRequest({
				path: `/profiles/${donation.profileUuid}`,
				token: process.env.RAISELY_TOKEN,
			});
			return this.assignToFacilitator({ donation, facilitator: facilitatorProfile.user });
		}

		const eventWindow = tzc.DateTime.nowUtc().sub(ATTRIBUTION_WINDOW).format('yyyy-MM-dd');

		const rsvps = await raiselyRequest({
			path: '/event_rsvps',
			qs: {
				campaign: PORTAL_PATH,
				startAtGTE: eventWindow,
				user: donation.userUuid,
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
				this.assignToFacilitator({ rsvp, donation }),
				this.markFulfilled(rsvp, donation),
			]);
		} else {
			this.log(`${donation.uuid} No matching conversation rsvp found, not moving`);
		}
	}

	async markFulfilled(rsvp, donation) {
		return raiselyRequest({
			path: `/event_rsvps/${rsvp.uuid}`,
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

	async assignToFacilitator({ rsvp, donation, facilitator }) {
		let facil = facilitator;
		if (!facilitator) {
			if (!rsvp) throw new Error(`assignToFacilitator: Cannot assign facilitator, no rsvp or facilitator passed in`);
			const team = await fetchTeam(rsvp.eventUuid);
			facil = team.facilitator;
		}

		// Get Facilitor for event
		const profile = await this.upsertProfile(facil);

		// Assign donation to facilitator profile
		await raiselyRequest({
			path: `/donations/${donation.uuid}/move`,
			method: 'PATCH',
			data: { profileUuid: profile.uuid },
			token: process.env.RAISELY_TOKEN,
		});

		// Note the uuid of the conversation
		await raiselyRequest({
			path: `/donations/${donation.uuid}`,
			method: "PATCH",
			data: {
				private: {
					conversationUuid: rsvp.eventUuid,
				},
			},
			token: process.env.RAISELY_TOKEN,
		});
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
