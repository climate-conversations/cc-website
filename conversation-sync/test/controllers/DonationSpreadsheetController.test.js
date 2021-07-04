const { nockEventTeam } = require('../testHelper');
const DonationSpreadsheetController = require('../../src/controllers/DonationSpreadsheetController');
const mockSheets = require('../helpers/mockSheets');
const { expect } = require('chai');
const sinon = require('sinon');

/**
 * This tests the event handling and processing to the Google Sheet
 * By default this runs against mocks, but you can also safely test it against
 * the live spreadsheet by running LIVE_TEST=1 npx mocha <this file>
 *
 * Setting LIVE_TEST will cause a worksheet "Donations 2020 TEST" to be created (if it doesn't already exist)
 * and test values will be saved to that worksheet
 */

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

const WITH_MOCK = !process.env.LIVE_TEST;

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
			"Cash Transferred According to screenshot": 30.00,
			"Cash donation report URL": 'report.jpg',
			"ConversationId": "mocked-event",
			"Date": "2020-01-16",
			"Date of Transfer in screenshot": '2020-01-18',
			"Facilitator": facilitator.fullName,
			"Facilitator Notes": 'Fixed now',
			"Host": host.fullName,
			"Scanned Report Total": 50.00,
			"Screenshot of transfer URL": 'transfer.jpg',
			"Team Leader Notes": 'This does not look right',
			"Total from CTA forms": 20.00,
			"Total reported bank transfers": 5.00,
			"Transfer Reference": 'abcd',
		};
	}

	describe('WHEN sheet exists', () => {
		before(() => {
			mockSheet = setup([{ title: 'Donations 2020 TEST', rows: [] }]);
			return process(baseEvent);
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
			mockSheet = setup([{ title: 'Donations 2019' }]);
			return process(baseEvent);
		});
		after(() => {
			sandbox.restore();
		});
		if (WITH_MOCK) {
			it('creates sheet', () => {
				mockSheet.assertCall('addSheet', [{
					title: 'Donations 2020 TEST',
					headerValues: [
						"Host",
						"Facilitator",
						"ConversationId",
						"Date",
						"Total from CTA forms",
						"Total reported bank transfers",
						"Scanned Report Total",
						"Cash Transferred According to screenshot",
						"Screenshot of transfer URL",
						"Date of Transfer in screenshot",
						"Transfer Reference",
						"Cash donation report URL",
						"Cash Received in Bank Account",
						"Bank Reconcilliation",
						"Facilitator Notes",
						"Team Leader Notes",
						"Other Notes",
					]
				}]);
			});
			itCreatesRow();
		} else {
			itHasNoErrors();
		}
	});
	describe('WHEN row exists', () => {
		before(() => {
			mockSheet = setup([{
				title: 'Donations 2020 TEST',
				rows: [{
					ConversationId: baseEvent.uuid,
				}],
			}]);
			return process(baseEvent);
		});
		after(() => {
			sandbox.restore();
		});
		if (WITH_MOCK) {
			it('updates row', () => {
				mockSheet.assertCall('save', [getExpectedRow()]);
			})
		} else {
			itHasNoErrors();
		}

	});
	describe('WHEN event is not a conversation', () => {
		before(() => {
			mockSheet = setup([]);
			return process({ uuid: 'not conversation' });
		});
		after(() => {
			sandbox.restore();
		});
		if (WITH_MOCK) {
			it('does nothing', () => {
				expect(mockSheet.calls).to.not.haveOwnProperty('getInfo');
			});
		} else {
			itHasNoErrors();
		}
	});

	function itHasNoErrors() {
		it('has no errors');
	}

	function itCreatesRow() {
		it('creates row', () => {
			mockSheet.assertCall('addRow', [getExpectedRow()]);
		});
	}

	function setup(document) {
		sandbox = sinon.createSandbox();
		if (!WITH_MOCK) console.log('CONNECTING TO LIVE SPREADSHEETS');
		return WITH_MOCK ? mockSheets(sandbox, document) : null;
	}

	async function process(person) {
		({ facilitator, host } = nockEventTeam());
		data = person;
		const result = await controller.process({
			data: { type: 'event.updated', data },
		});
		return result;
	}
});
