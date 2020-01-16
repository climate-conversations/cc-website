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
			mockSheet = setup([{ title: 'Surveys 2020', rows: [] }]);
			return processController(guestData);
		});
		after(() => {
			sandbox.restore();
		});
		it('does not create sheet', () => {
			expect(mockSheet.calls).to.not.haveOwnProperty('addSheet');
		});
		itCreatesRow();
	});
	describe('WHEN sheet does not exist', () => {
		before(() => {
			mockSheet = setup([{ title: 'Surveys 2019' }]);
			return processController(guestData);
		});
		after(() => {
			sandbox.restore();
		});
		it('creates sheet', () => {
			mockSheet.assertCall('addWorksheet', [{ title: 'Surveys 2020' }]);
		});
		it('sets header', () => {
			expect(mockSheet.calls).to.haveOwnProperty('setHeaderRow');
			expect(mockSheet.calls.setHeaderRow).to.deep.eq([headers]);
		});
		itCreatesRow();
	});
	describe('WHEN row exists', () => {
		before(() => {
			mockSheet = setup([{
				title: 'Surveys 2020',
				rows: [{
					guestid: guestData.rsvp.uuid,
				}],
			}]);
			return processController(guestData);
		});
		after(() => {
			sandbox.restore();
		});
		it('updates row', () => {
			mockSheet.assertCall('save', [getExpectedRow({ facilitator, host })]);
		})
	});

	function itCreatesRow() {
		it('creates row', () => {
			mockSheet.assertCall('addRow', [getExpectedRow({ facilitator, host })]);
		});
	}

	function setup(document) {
		sandbox = sinon.createSandbox();
		return mockSheets(sandbox, document);
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
