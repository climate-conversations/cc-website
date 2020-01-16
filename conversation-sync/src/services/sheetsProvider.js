const GoogleSpreadsheet = require('google-spreadsheet');

module.exports = {
	/**
	 * Simple wrapper around the sheets api to allow us to inject a mock
	 * in tests
	 * @param {string} key
	 */
	load(key) {
		return new GoogleSpreadsheet(key);
	}
}
