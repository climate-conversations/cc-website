const { nockRaisely, nockCollection, nockEventTeam } = require('../testHelper');
const { expect } = require('chai');
const nock = require('nock');

const DonationFacilMatchController = require('../../src/controllers/DonorFacilMatchController');

const baseDonation = {
	uuid: 'mock-donation-uuid',
	email: 'donor@cc.test',
	profile: { path: process.env.WEBSITE_PATH },
};

let patchBody = null;
let movedProfileUuid = null;
let createdProfile = null;

describe('Donation Facilitator Matching', () => {
	let controller;
	let data;
	let facilitator;
	before(() => {
		controller = new DonationFacilMatchController({
			log: console.log,
		});
		nock.cleanAll();
	});

	describe('WHEN no matching rsvp', () => {
		before(() => {
			nockCollection(nockRaisely(), /\/eventRsvps.*/, []);
			return process(baseDonation);
		});
		itDoesNothing();
	});
	describe('WHEN donation is in a profile', () => {
		before(() => {
			return process({
				...baseDonation,
				profile: { path: 'not-the-top' },
			});
		});
		itDoesNothing();
	});
	describe('WHEN profile exists', () => {
		before(() => {
			setupNocks([{ uuid: 'existing-profile' }]);
			return process(baseDonation);
		});
		itMovesDonation('existing-profile');
		itMarksIntentionFulfilled();
	});
	describe('WHEN profile does not exist', () => {
		before(() => {
			({ facilitator } = setupNocks([]));
			nockCreateProfile();
			return process(baseDonation);
		});
		it('creates a profile', () => {
			expect(createdProfile).to.containSubset({
				userUuid: facilitator.uuid,
				name: facilitator.fullName,
				photoUrl: facilitator.photoUrl,
				goal: 20000,
			});
		})
		itMovesDonation('created-profile');
		itMarksIntentionFulfilled();
	});

	async function process(donation) {
		data = donation;
		const result = await controller.process({
			data: { type: 'donation.created', data },
		});
		return result;
	}

	function itMovesDonation(profileUuid) {
		it('moves donation', () => {
			expect(movedProfileUuid).to.eq(profileUuid);
		})
	}

	function itMarksIntentionFulfilled() {
		it('marks intention fulfilled', () => {
			expect(patchBody).to.containSubset({
				data: {
					private: {
						donationUuid: baseDonation.uuid,
					}
				}
			})
		});
		it('sets partial flag', () => {
			// Without this flag, the rest of rsvp.private will be erased
			expect(patchBody.partial).to.eq(true);
		});
	}

	function itDoesNothing() {
		it('does nothing', () => {
			expect(movedProfileUuid).to.be.null;
		})
	}
});

function setupNocks(profiles) {
	const rsvp = { uuid: 'mocked-rsvp', eventUuid: 'mock-event-uuid', private: { donationIntention: 'creditcard' } }
	movedProfileUuid = null;
	patchBody = null;

	const n = nockRaisely()

	const days = 1000 * 60 * 60 * 24;
	const date = new Date(new Date() - 14 * days).toISOString().slice(0,10);

	// FIXME test the exact date as it looks like it's wrong
	nockCollection(n, `/eventRsvps?startAtGTE=${date}&user.email=${encodeURIComponent(baseDonation.email)}`, [rsvp]);
	const team = nockEventTeam();
	const { facilitator } = team;
	nockCollection(n, `/users/${facilitator.uuid}/profiles?type=INDIVIDUAL`, profiles);
	n
		.patch(`/donations/${baseDonation.uuid}/move`)
		.reply((uri, body) => {
			movedProfileUuid = body.data.profileUuid;
			return [200, {}];
		})
		.patch(`/eventRsvps/${rsvp.uuid}`)
		.reply((uri, body) => {
			patchBody = body;
			return [200, {}];
		});
	return team;
}

function nockCreateProfile() {
	nockRaisely()
		.post(`/campaigns/${process.env.WEBSITE_PATH}/profiles`)
		.reply((uri, body) => {
			createdProfile = body.data;
			return [200, { data: { uuid: 'created-profile' } }];
		});
}
