const baseUrl = 'https://asia-northeast1-climate-conversations-sync.cloudfunctions.net/';

const crons = [{
	request: 'raiselyPeopleRetry',
}, {
	request: 'backendReportRetry',
}, {
	request: 'donationSpreadsheetRetry',
}, {
	request: 'donorFacilMatchRetry',
}, {
	request: 'mailchimpRetry',
}].map(job => job.request = `${baseUrl}${job.request}`);

module.exports = crons;
