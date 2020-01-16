/* eslint-disable class-methods-use-this */
const { AirblastController } = require('airblast');
const _ = require('lodash');
const tzc = require('timezonecomplete');

const { getField, raiselyToRow } = require('../helpers/raiselyHelpers');
const { isoToSgDateAndTime } = require('../helpers/dateHelpers');
const { getSpreadsheet, findOrCreateWorksheet, upsertRow } = require('../services/sheets');
const { fetchTeam } = require('../helpers/raiselyConversationHelpers');
const { centsToDollars } = require('../helpers/money');

const options = {
	wrapInData: true,
};

const currencyKeys = ['cashReceivedAmount', 'cashTransferAmount', 'statCache.donations.cash', 'statCache.donations.transfer']
	.map(key => `private.${key}`);
const headers = [
	{ id: 'host.fullName', label: 'Host' },
	{ id: 'facilitator.fullName', label: 'Facilitator' },
	{ id: 'event.uuid', label: 'ConversationId' },
	{ id: 'event.date', label: 'Date'},
	{ id: 'event.private.statCache.donations.cash', label: 'Total from CTA forms' },
	{ id: 'event.private.statCache.donations.transfer', label: 'Total reported bank transfers' },
	{ id: 'event.cashReceivedAmount', label: 'Scanned Report Total' },
	{ id: 'event.cashTransferAmount', label: 'Cash Transferred (according to screenshot)' },
	{ id: 'event.cashTransferScreenshot', label: 'Screenshot of transfer (url)' },
	{ id: 'event.cashTransferDate', label: 'Date of Transfer (in screenshot)' },
	{ id: 'event.cashTransferReference', label: 'Transfer Reference' },
	{ id: 'event.cashReportScan', label: 'Cash donation report (url)' },
	{ id: null, label: 'Cash Received in Bank Account' },
	{ id: null, label: 'Bank Reconcilliation' },
	{ id: 'event.cashDonationsFacilitatorNotes', label: 'Facilitator Notes' },
	{ id: 'event.cashDonationsLeaderNotes', label: 'Team Leader Notes' },
	{ id: null, label: 'Other Notes' },
];

function formatHeaders() {
	return headers.map(h => h.label);
}

function headersToMap() {
	const result =	{};
	headers.map(h => {
		if (h.id) result[h.id] = h.label;
	});
	return result;
}

class DonationSpreadsheet extends AirblastController {
	async process({ data }) {
		const { DONATION_SPREADSHEET } = process.env;
		const year = new tzc.DateTime().format('yyyy');
		const sheetTitle = `Donations ${year}`;

		const validEvents = ['event.created', 'event.updated'];
		if (validEvents.includes(data.type)) throw new Error(`Unrecognised event ${data.type}`);

		const conversation = _.cloneDeep(data.data);

		if (!conversation || !conversation.uuid) throw new Error('Conversation missing or missing uuid');
		if (!_.has(conversation, 'private.conversationType')) {
			this.log(`Event ${conversation.uuid} is not a conversation. Skipping`);
			return;
		}

		// Fetch host and facil
		const { host, facilitator } = await fetchTeam(conversation.uuid);

		const record = {
			event: conversation,
			host,
			facilitator,
		};

		record.event.date = isoToSgDateAndTime(record.event.startAt).date;
		const transferDate = getField(record, 'event.cashTransferredAt');
		if (transferDate) record.event.cashTransferDate = isoToSgDateAndTime(transferDate).date;

		currencyKeys.forEach(key => {
			const value = _.get(conversation, key);
			if (value) _.set(conversation, key, centsToDollars(value));
		})

		const document = await getSpreadsheet(DONATION_SPREADSHEET);
		const { sheet } = await findOrCreateWorksheet(document, sheetTitle, formatHeaders());

		const row = raiselyToRow(record, headersToMap());

		// Create row
		await upsertRow(sheet, `conversationid = ${record.event.uuid}`, row);
	}
}

DonationSpreadsheet.options = options;

module.exports = DonationSpreadsheet;
