const requestPromiseCache = require('request-promise-cache');
const sinon = require('sinon');
const { expect } = require('chai');

const { nockEventTeam } = require('../testHelper');
const SavePhotoControler = require('../../src/controllers/SaveDonationPhotosController');

const mockDrive = require('../helpers/mockDrive');

const WITH_MOCK = !process.env.LIVE_TEST;

let facilitator;
let host;
let sandbox;

const photoUrl =
	'https://raisely-images.imgix.net/uploads/screenshot-2020-02-18-at-10-04-39-am-png-7a91fe.png';

describe('Save Donations Photo Controller', () => {
	let controller;
	let res;
	let mockedDrive;

	before(() => {
		process.env.GOOGLE_PROJECT_CREDENTIALS =
			'./test/controllers/fixtures/mockDriveCreds.json';

		requestPromiseCache.cache.clear();
		controller = new SavePhotoControler({
			log: console.log,
		});
	});
	describe('Report photo', () => {
		before(async () => {
			mockedDrive = mockGoogle();
			res = await processController({
				conversation: {
					uuid: 'fake-uuid',
					startAt: '2019-04-15T12:00:00Z',
				},
				url: photoUrl,
				type: 'report',
			});
		});
		after(() => {
			sandbox.restore();
		});
		itSucceeds(
			'2019-04-15 - fake-uuid - report - host Test Host - facil Test Facilitator'
		);
	});
	describe('Transfer photo', () => {
		before(async () => {
			mockedDrive = mockGoogle();
			res = await processController({
				conversation: {
					uuid: 'fake-uuid',
					startAt: '2019-04-14T23:30:00Z',
				},
				url: photoUrl,
				type: 'transfer',
			});
		});
		after(() => {
			sandbox.restore();
		});
		itSucceeds(
			'2019-04-15 - fake-uuid - transfer - host Test Host - facil Test Facilitator'
		);
	});
	function itSucceeds(expectedName) {
		it('sets photo name', () => {
			expect(res.data.name).to.eq(expectedName);
		});
		if (WITH_MOCK) {
			it('uploads photo', () => {
				expect(mockedDrive.calls['files.create']).to.containSubset([
					{
						name: expectedName,
					},
				]);
			});
		}
	}

	async function processController(data) {
		({ facilitator, host } = nockEventTeam());
		const result = await controller.process({
			data: { type: 'conversation.donationReportUploaded', data },
		});
		return result;
	}

	function mockGoogle() {
		sandbox = sinon.createSandbox();
		if (!WITH_MOCK) console.log('CONNECTING TO LIVE GOOGLE DRIVE');
		return WITH_MOCK ? mockDrive(sandbox) : null;
	}
});
