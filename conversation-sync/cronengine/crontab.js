// FIXME create generator for this file

// Every 10 minutes
const schedule = '*/20 * * * *';

const crons = [{
	schedule,
	request: 'raiselyPeopleRetry',
}, {
	schedule,
	request: 'backendReportRetry',
}, {
	schedule,
	request: 'donationSpreadsheetRetry',
}, {
	schedule,
	request: 'donorFacilMatchRetry',
}, {
	schedule,
	request: 'mailchimpRetry',
}];

module.exports = crons;
