const requestPromiseCache = require('request-promise-cache');
const sinon = require('sinon');
const { expect } = require('chai');

const { nockEventTeam } = require('../testHelper');
const SavePhotoControler = require('../../src/controllers/SavePhotoController');

const mockDrive = require('../helpers/mockDrive');

const WITH_MOCK = !process.env.LIVE_TEST;

let facilitator;
let host;
let sandbox;

const photoUrl = 'https://raisely-images.imgix.net/uploads/screenshot-2020-02-18-at-10-04-39-am-png-7a91fe.png';

describe('Save Photo Controller', () => {
	let controller;
	let expectedName;
	before(() => {
		requestPromiseCache.cache.clear();
		controller = new SavePhotoControler({
			log: console.log,
		});
	});
	describe('Saves Photo', () => {
		let res;
		let mockedDrive;
		before(async () => {
			mockedDrive = mockGoogle();
			res = await processController({
				conversation: {
					uuid: 'fake-uuid',
					startAt: '2019-04-15',
				},
				url: photoUrl,
				photoConsent: true,
			});
		});
		after(() => {
			sandbox.restore();
		});

		it('sets photo name', () => {
			expectedName = `2019-04-15 - host ${host.fullName} - facil ${facilitator.fullName}`;
			console.log(res)
			expect(res.data.name).to.eq(expectedName);
		});
		if (WITH_MOCK) {
			it('uploads photo', () => {
				expect(mockedDrive.calls['files.create']).to.containSubset([
					{
						name: expectedName,
					}
				]);
			});
		}
	});
	async function processController(data) {
		({ facilitator, host } = nockEventTeam());
		const result = await controller.process({
			data: { type: 'conversation.photoUploaded', data },
		});
		return result;
	}

	function mockGoogle() {
		sandbox = sinon.createSandbox();
		if (!WITH_MOCK) console.log('CONNECTING TO LIVE GOOGLE DRIVE');
		return WITH_MOCK ? mockDrive(sandbox) : null;
	}
});

