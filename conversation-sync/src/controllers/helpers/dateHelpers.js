const TZC = require('timezonecomplete');

const dateKeys = ['dateofbirth', 'conversationdate'];

/**
  * Converts a given date string to an iso8601 date (yyyy-mm-dd)
  * Also assumes that the date is in american (mm/dd/yyyy) UNLESS
  * the month > 12
  * @param {string} googleDate The date from google
  * @returns {string} The date in 'yyyy-mm-dd' format
  */
function sheetsToIsoDate(dateStr) {
	// Google sheets is incorrectly storing as US date format
	// eslint-disable-next-line prefer-const
	let [month, day, year] = dateStr.split('/');

	// But, if it doesn't fit in a US date (ie the day > 12) then it stores
	// it in GB date format
	if (parseInt(month, 10) > 12) {
		const tmp = day;
		day = month;
		month = tmp;
	}

	const isoDate = [year.padStart(4, '0'), month.padStart(2, '0'), day.padStart(2, '0')].join('-');

	return isoDate;
}

/**
  * Kepla stores dates with timezones, so every date needs to be converted to
  * Singapore time to be consistent with kepla dates
  * @param {string} isoDate Date in the form 'yyyy-mm-dd'
  * @returns {string} Date formatted in iso8601, utc time
  */
function isoDateToKeplaDate(isoDate) {
	return TZC.DateTime(isoDate).withZone(TZC.zone('Singapore/Singapore')).toUtcString();
}

module.exports = {
	isoDateToKeplaDate,
	sheetsToIsoDate,
	dateKeys,
};
