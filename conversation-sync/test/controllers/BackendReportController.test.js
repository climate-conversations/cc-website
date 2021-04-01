const BackendReportController = require('../../src/controllers/BackendReportController');
const { expect } = require('chai');
const { nockEventTeam, nockRaisely } = require('../testHelper');
const mockSheets = require('../helpers/mockSheets');
const sinon = require('sinon');

const {
	guestData,
	campaignConfig,
	headers,
	getExpectedRow,
} = require('./fixtures/backendReportFixtures');

let facilitator;
let host;

const WITH_MOCK = !process.env.LIVE_TEST;

describe('Backend Report Controller', () => {
	let controller;
	let data;
	let sandbox;
	let mockSheet;
	before(() => {
		controller = new BackendReportController({
			log: console.log,
		});
	});

	describe('WHEN sheet exists', () => {
		before(() => {
			mockSheet = setup([{ title: 'Surveys 2020 TEST', rows: [] }]);
			return processController(guestData);
		});
		after(() => {
			sandbox.restore();
		});
		if (WITH_MOCK) {
			it('does not create sheet', () => {
				expect(mockSheet.calls).to.not.haveOwnProperty('addSheet');
			});
			itCreatesRow();
		} else {
			itHasNoErrors();
		}
	});
	describe('WHEN sheet does not exist', () => {
		before(() => {
			mockSheet = setup([{ title: 'Surveys 2019 TEST' }]);
			return processController(guestData);
		});
		after(() => {
			sandbox.restore();
		});
		if (WITH_MOCK) {
			it('creates sheet', () => {
				mockSheet.assertCall('addSheet', [{ title: 'Surveys 2020 TEST' }]);
			});
			it('sets header', () => {
				mockSheet.assertCall('addSheet', [{ headerValues: headers }]);
			});
			itCreatesRow();
		} else {
			itHasNoErrors();
		}
	});
	describe('WHEN row exists', () => {
		before(() => {
			mockSheet = setup([{
				title: 'Surveys 2020 TEST',
				rows: [{
					GuestId: guestData.rsvp.uuid,
				}],
			}]);
			return processController(guestData);
		});
		after(() => {
			sandbox.restore();
		});
		if (WITH_MOCK) {
			it('updates row', () => {
				mockSheet.assertCall('save', [getExpectedRow({ facilitator, host })]);
			})
		} else {
			itHasNoErrors();
		}
	});

	function itHasNoErrors() {
		it('has no errors', () => {});
	}

	function itCreatesRow() {
		it('creates row', () => {
			mockSheet.assertCall('addRow', [getExpectedRow({ facilitator, host })]);
		});
	}

	function setup(document) {
		sandbox = sinon.createSandbox();
		if (!WITH_MOCK) console.log('CONNECTING TO LIVE SPREADSHEETS');
		return WITH_MOCK ? mockSheets(sandbox, document) : null;
	}

	async function processController(person) {
		nockRaisely()
			.get(`/campaigns/${process.env.PORTAL_PATH}/config`)
			.reply(200, { data: campaignConfig });
		({ facilitator, host } = nockEventTeam());
		data = person;
		const result = await controller.process({
			data: { type: 'guest.created', data },
		});
		return result;
	}
});
