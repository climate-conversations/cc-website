const GoogleSpreadsheet = require('google-spreadsheet');
const { promisify } = require('util');
const path = require('path');

function instancePromisify(obj, fnName) {
	return promisify(obj[fnName]).bind(obj);
}

async function setAuth(document, credentialsPath) {
	const fullPath = path.join(process.cwd(), credentialsPath);

	const creds = require(fullPath);

	return instancePromisify(document, 'useServiceAccountAuth')(creds);
}

async function fetchRows(count) {
	const { SPREADSHEET_KEY, WORKSHEET_TITLE, GOOGLE_PROJECT_CREDENTIALS } = process.env;

	console.log(`Authenticating to spreadsheet ${SPREADSHEET_KEY}`);
	// spreadsheet key is the long id in the sheets URL
	const document = new GoogleSpreadsheet(SPREADSHEET_KEY);
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
	fetchRows,
};
