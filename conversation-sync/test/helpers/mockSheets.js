const GoogleSpreadsheetLoader = require('../../src/services/sheetsProvider');
const { expect } = require('chai');

const example = [
	{
		title: 'Title',
		headers: [],
		rows: [{}]
	}
]

function logCall(document, name, ...args) {
	document.calls[name] = args;
}

class GoogleSpreadsheet {
	constructor(document)  {
		this.worksheets = (document || []).map(sheet => new Worksheet(this, sheet));
		this.calls = {};
	}
	logCall(fn, ...args) {
		logCall(this, fn, ...args);
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

	assertCall(fn, args) {
		expect(this.calls).to.haveOwnProperty(fn);
		expect(this.calls[fn]).to.containSubset(args);
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
