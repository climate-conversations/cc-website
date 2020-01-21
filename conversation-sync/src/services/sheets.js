const GoogleSpreadsheet = require('./sheetsProvider');
const { promisify } = require('util');
const path = require('path');

function instancePromisify(obj, fnName) {
	return promisify(obj[fnName]).bind(obj);
}

async function setAuth(document, credentialsPath) {
	const fullPath = path.join(process.cwd(), credentialsPath);

	// eslint-disable-next-line global-require, import/no-dynamic-require
	const creds = require(fullPath);

	return instancePromisify(document, 'useServiceAccountAuth')(creds);
}

async function findOrCreateWorksheet(document, worksheetTitle, headers) {
	const info = await instancePromisify(document, 'getInfo')();
	let isNew = false;
	let sheet = info.worksheets.find(w => w.title === worksheetTitle);
	if (!sheet) {
		sheet = await instancePromisify(document, 'addWorksheet')({ title: worksheetTitle, headers });
		isNew = true;
	}
	return { sheet, isNew };
}

/**
 * Insert or update a row in the spreadsheet
 * @param {GoogleWorksheet} sheet The worksheet
 * @param {string} query A query that returns exactly 1 row
 * @param {object} row
 */
async function upsertRow(sheet, query, row) {
	const rows = await instancePromisify(sheet, 'getRows')({ query });
	if (rows.length > 1) {
		throw new Error('upsert found more than one row, aborting upsert');
	} else if (rows.length) {
		// Update
		Object.assign(rows[0], row);
		return instancePromisify(rows[0], 'save')();
	} else {
		// Insert
		return instancePromisify(sheet, 'addRow')(row);
	}
}

async function getSpreadsheet(key) {
	const { GOOGLE_PROJECT_CREDENTIALS } = process.env;
	const document = GoogleSpreadsheet.load(key);
	await setAuth(document, GOOGLE_PROJECT_CREDENTIALS);
	return document;
}

async function fetchRows(count) {
	const { SPREADSHEET_KEY, WORKSHEET_TITLE, GOOGLE_PROJECT_CREDENTIALS } = process.env;

	console.log(`Authenticating to spreadsheet ${SPREADSHEET_KEY}`);
	// spreadsheet key is the long id in the sheets URL
	const document = GoogleSpreadsheet.load(SPREADSHEET_KEY);
	await setAuth(document, GOOGLE_PROJECT_CREDENTIALS);

	const info = await instancePromisify(document, 'getInfo')();

	// Find worksheet
	console.log(`Finding worksheet ${WORKSHEET_TITLE}`);
	const sheet = info.worksheets.find(w => w.title === WORKSHEET_TITLE);
	if (!sheet) throw new Error(`Could not find worksheet '${WORKSHEET_TITLE}'`);

	console.log('Calculating last row');
	const rowCount = await getTrueLength(sheet);

	const offset = Math.max(1, rowCount - count);
	console.log(`Fetching last ${count} rows (starting at row: ${offset})...`);
	const rows = await instancePromisify(sheet, 'getRows')({
		offset,
		limit: count,
	});

	return rows;
}

async function getTrueLength(sheet) {
	const pageSize = 100;
	let offset = 1;
	let trueLength;

	do {
		// eslint-disable-next-line no-await-in-loop
		const cells = await instancePromisify(sheet, 'getCells')({
			'min-row': offset,
			'max-row': offset + pageSize,
			'min-col': 1,
			'max-col': 1,
			'return-empty': true,
		});
		offset += pageSize;

		const emptyRow = cells.find(cell => !cell.value);
		if (emptyRow) trueLength = emptyRow.row - 1;
	} while (!trueLength && (offset < sheet.rowCount));

	if (!trueLength) trueLength = sheet.rowCount;

	return trueLength;
}

module.exports = {
	getSpreadsheet,
	fetchRows,
	findOrCreateWorksheet,
	upsertRow,
};
