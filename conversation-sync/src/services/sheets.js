const _ = require('lodash');
const GoogleSpreadsheet = require('./sheetsProvider');
const path = require('path');

// If two events come in quick succession for the same
// conversation, upsert might create a duplicate
// this prevents more than one from occurring
const upsertLocks = {};

async function setAuth(document, credentialsPath) {
	const fullPath = path.join(process.cwd(), credentialsPath);

	// eslint-disable-next-line global-require, import/no-dynamic-require
	const creds = require(fullPath);

	return document.useServiceAccountAuth(creds);
}

async function findOrCreateWorksheet(document, worksheetTitle, headers) {
	await document.loadInfo();
	let isNew = false;
	let sheet = document.sheetsByIndex.find(w => w.title === worksheetTitle);
	if (!sheet) {
		sheet = await document.addSheet({ title: worksheetTitle, headerValues: headers, gridProperties: { columnCount: headers.length } });
		isNew = true;
	}
	return { sheet, isNew };
}

/**
 * Insert or update a row in the spreadsheet
 * @param {GoogleWorksheet} sheet The worksheet
 * @param {object|fn} match Column name / value pairs
 * @param {object} row The row values to insert / update
 */
async function doUpsertRow(sheet, match, newRow) {
	let offset = 0;
	let limit = 1000;
	let rows;
	let matchingRow;
	const searchKeys = Object.keys(match)
	const searchFn = _.isFunction(match) ? match : row => searchKeys.reduce((all, key) => all && (row[key] === match[key]), true);

	do {
		rows = await sheet.getRows({ limit, offset });
		matchingRow = rows.find(searchFn);
		offset += limit;
	} while (!matchingRow && rows.length === limit)

	await new Promise(r => setTimeout(r, 2000));

	if (matchingRow) {
		// Update
		Object.assign(matchingRow, newRow);
		return matchingRow.save();
	} else {
		// Insert
		return sheet.addRow(newRow);
	}
}

/**
 * Wraps the upsert to lock on a per record basis
 * @param {*} sheet
 * @param {*} match
 * @param {*} newRow
 * @returns
 */
async function upsertRow(sheet, match, newRow) {
	const key = JSON.stringify(match);
	while (upsertLocks[key]) {
		await upsertLocks[key];
	}
	upsertLocks[key] = doUpsertRow(sheet, match, newRow);
	const result = await upsertLocks[key];
	delete upsertLocks[key];
	return result;
}

async function getSpreadsheet(key) {
	const { GOOGLE_PROJECT_CREDENTIALS } = process.env;
	const document = GoogleSpreadsheet.load(key);
	await setAuth(document, GOOGLE_PROJECT_CREDENTIALS);
	return document;
}

async function fetchRows(count) {
	const { SPREADSHEET_KEY, WORKSHEET_TITLE, GOOGLE_PROJECT_CREDENTIALS } = process.env;

	// spreadsheet key is the long id in the sheets URL
	const document = GoogleSpreadsheet.load(SPREADSHEET_KEY);
	await setAuth(document, GOOGLE_PROJECT_CREDENTIALS);

	await document.loadInfo();

	// Find worksheet
	const sheet = document.sheetsByIndex.find(w => w.title === WORKSHEET_TITLE);
	if (!sheet) throw new Error(`Could not find worksheet '${WORKSHEET_TITLE}'`);

	const offset = Math.max(1, sheet.rowCount - count);
	console.log(`Fetching last ${count} rows (starting at row: ${offset})...`);
	const rows = await sheet.getRows({
		offset,
		limit: count,
	});

	return rows;
}

module.exports = {
	getSpreadsheet,
	fetchRows,
	findOrCreateWorksheet,
	upsertRow,
};
