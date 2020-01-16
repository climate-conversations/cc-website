const { nockEventTeam } = require('../testHelper');
const DonationSpreadsheetController = require('../../src/controllers/DonationSpreadsheetController');
const mockSheets = require('../helpers/mockSheets');
const { expect } = require('chai');
const sinon = require('sinon');

const baseEvent = {
	uuid: 'mocked-event',
	startAt: '2020-01-16T12:00:00 +00:00',
	private: {
		conversationType: 'Private',
		statCache: {
			donations: {
				cash: 2000,
				transfer: 500,
			},
		},
		cashReceivedAmount: 5000,
		cashTransferAmount: 3000,
		cashTransferredAt: '2020-01-18T12:00:00 +00:00',
		cashTransferScreenshot: 'transfer.jpg',
		cashTransferReference: 'abcd',
		cashReportScan: 'report.jpg',
		cashDonationsFacilitatorNotes: 'Fixed now',
		cashDonationsLeaderNotes: 'This does not look right',
	},
}

describe('Donation Spreadsheet Controller', () => {
	let controller;
	let data;
	let sandbox;
	let mockSheet;
	let facilitator;
	let host;
	before(() => {
		controller = new DonationSpreadsheetController({
			log: console.log,
		});
	});

	function getExpectedRow() {
		return {
			"Cash Transferred (according to screenshot)": 30.00,
			"Cash donation report (url)": 'report.jpg',
			"ConversationId": "mocked-event",
			"Date": "2020-01-16",
			"Date of Transfer (in screenshot)": '2020-01-18',
			"Facilitator": facilitator.fullName,
			"Facilitator Notes": 'Fixed now',
			"Host": host.fullName,
			"Scanned Report Total": 50.00,
			"Screenshot of transfer (url)": 'transfer.jpg',
			"Team Leader Notes": 'This does not look right',
			"Total from CTA forms": 20.00,
			"Total reported bank transfers": 5.00,
			"Transfer Reference": 'abcd',
		};
	}

	describe('WHEN sheet exists', () => {
		before(() => {
			nockEventTeam();
			mockSheet = setup([{ title: 'Donations 2020', rows: [] }]);
			return process(baseEvent);
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
			mockSheet = setup([{ title: 'Donations 2019' }]);
			return process(baseEvent);
		});
		after(() => {
			sandbox.restore();
		});
		it('creates sheet', () => {
			mockSheet.assertCall('addWorksheet', [{
				title: 'Donations 2020',
			}]);
		});
		it('sets header', () => {
			expect(mockSheet.calls).to.haveOwnProperty('setHeaderRow');
			expect(mockSheet.calls.setHeaderRow).to.deep.eq([[
				"Host",
				"Facilitator",
				"ConversationId",
				"Date",
				"Total from CTA forms",
				"Total reported bank transfers",
				"Scanned Report Total",
				"Cash Transferred (according to screenshot)",
				"Screenshot of transfer (url)",
				"Date of Transfer (in screenshot)",
				"Transfer Reference",
				"Cash donation report (url)",
				"Cash Received in Bank Account",
				"Bank Reconcilliation",
				"Facilitator Notes",
				"Team Leader Notes",
				"Other Notes",
			]]);
		});
		itCreatesRow();
	});
	describe('WHEN row exists', () => {
		before(() => {
			nockEventTeam();
			mockSheet = setup([{
				title: 'Donations 2020',
				rows: [{
					ConversationId: baseEvent.uuid,
				}],
			}]);
			return process(baseEvent);
		});
		after(() => {
			sandbox.restore();
		});
		it('updates row', () => {
			mockSheet.assertCall('save', [getExpectedRow()]);
		})
	});
	describe('WHEN event is not a conversation', () => {
		before(() => {
			mockSheet = setup([]);
			return process({ uuid: 'not conversation' });
		});
		after(() => {
			sandbox.restore();
		});
		it('does nothing', () => {
			expect(mockSheet.calls).to.not.haveOwnProperty('getInfo');
		});
	});

	function itCreatesRow() {
		it('creates row', () => {
			mockSheet.assertCall('addRow', [getExpectedRow()]);
		});
	}

	function setup(document) {
		sandbox = sinon.createSandbox();
		return mockSheets(sandbox, document);
	}

	async function process(person) {
		({ facilitator, host } = nockEventTeam());
		data = person;
		const result = await controller.process({
			data: { type: 'guest.created', data },
		});
		return result;
	}
});
