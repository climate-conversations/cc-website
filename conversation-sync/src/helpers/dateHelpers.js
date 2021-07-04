const TZC = require('timezonecomplete');
const _ = require('lodash');

const dateKeys = ['dateofbirth', 'conversationdate'];

/**
  * Converts a given date string to an iso8601 date (yyyy-mm-dd)
  * Also assumes that the date is in american (mm/dd/yyyy) UNLESS
  * the month > 12
  * @param {string} googleDate The date from google
  * @returns {string} The date in 'yyyy-mm-dd' format
  */
function sheetsToIsoDate(dateStr) {
	if (!_.isString(dateStr)) throw new Error(`${dateStr} must be a valid date`);
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
	// toUTCString will not add the Z, add it manually
	// eslint-disable-next-line prefer-template
	return (new TZC.DateTime(isoDate)).withZone(TZC.zone('Singapore')).toUtcString() + 'Z';
}

/**
 * Converts in ISO8601 date to date and time in SG timezone
 * @param {string} isoDate
 * @returns {object} { date: 'yyyy-MM-dd', time: 'HH:mm' }
 */
function isoToSgDateAndTime(isoDate) {
	const sgZone = TZC.TimeZone.zone('Asia/Singapore');
	const startAt = new TZC.DateTime(isoDate).convert(sgZone);
	const date = startAt.format('yyyy-MM-dd');
	const time = startAt.format('HH:mm');
	return { date, time };
}

/**
 * Takes a date and time and converts them to an ISO8601 date
 * The time is interpreted as Signapore time
 * @param {string} date
 * @param {string} time Singapore time in 24hr format
 * @returns {string} ISO8601 string
 */
function singaporeToISO(date, time) {
	const justDate = dayjs(date).format("YYYY-MM-DD");
	const fullTime = dayjs(`${justDate} ${time}`);
	if (!fullTime.isValid()) {
		throw new Error(
			`Cannot understand ${time}. Please specify the time in 24hr format (eg 21:30)`
		);
	}
	const adjustedTime = singaporeTimezone(fullTime);
	// Make the time in Singapore time
	return adjustedTime.toISOString();
}


module.exports = {
	isoToSgDateAndTime,
	isoDateToKeplaDate,
	sheetsToIsoDate,
	singaporeToISO,
	dateKeys,
};
