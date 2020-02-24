// FIXME create generator for this file

// Every 10 minutes
const schedule = '*/20 * * * *';

const baseUrl = 'https://asia-northeast1-climate-conversations-sync.cloudfunctions.net/';

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
}].map(job => job.request = `${baseUrl}${job.request}`);

module.exports = crons;
