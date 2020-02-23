const GoogleSpreadsheetLoader = require('../../src/services/sheetsProvider');
const MockClass = require('./mockClass');

const example = [
	{
		title: 'Title',
		headers: [],
		rows: [{}]
	}
]

class GoogleSpreadsheet extends MockClass {
	constructor(document)  {
		super();
		this.worksheets = (document || []).map(sheet => new Worksheet(this, sheet));
	}

	useServiceAccountAuth(creds, cb) {
		cb();
	}
	getInfo(cb) {
		this.logCall('getInfo');
		cb(null, { worksheets: this.worksheets });
	}
	addWorksheet(sheet, cb) {
		const worksheet = new Worksheet(this, sheet);
		this.worksheets.push(worksheet);
		this.logCall('addWorksheet', sheet);
		cb(null, worksheet);
	}
}

class Worksheet {
	constructor(document, sheet) {
		Object.assign(this, sheet);
		this.$document = document;
		this.rows = (sheet.rows || []).map(row => new Row(this.$document, row));
	}
	addRow(row, cb) {
		const newRow = new Row(this.$document, row);
		this.rows.push(newRow);
		this.$document.logCall('addRow', row);
		cb(null, newRow);
	}
	getRows(query, cb) { cb(null, this.rows) }
	setHeaderRow(headers, cb) {
		this.headers = headers;
		this.$document.logCall('setHeaderRow', headers);
		cb();
	}
}

class Row {
	constructor(document, row) {
		Object.assign(this, row);
		this.$document = document;
	}
	save(cb) {
		this.$document.logCall('save', { ...this });
		cb();
	}
}

/**
 * @param {Sandbox} sandbox sinon sandbox to stub the loader within
 * @param {object[]} document mocked spreadsheet to return from load
 * @returns {GoogleSpreadsheet} The mocked spreadsheet whose recent function calls can be inspected via calls property
 */
function mockSheets(sandbox, document) {
	const googleSheet = new GoogleSpreadsheet(document);

	sandbox.stub(GoogleSpreadsheetLoader, 'load').returns(googleSheet);
	return googleSheet;
}

module.exports = mockSheets;
