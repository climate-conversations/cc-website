const raiselyEvents = {
	'user.created': ['mailchimp'],
	'user.updated': ['mailchimp'],
	'user.forgotten': ['mailchimp'],
	'donation.created': ['donorFacilMatch', 'mailchimp'],
	'guest.created': ['backendReport'],
	'conversation.photoUploaded': ['savePhoto'],
	'event.created': ['donationSpreadsheet'],
	'event.updated': ['donationSpreadsheet'],
};

const mailchimpEvents = {
	'unsubscribe': ['raiselySubscriptions'],
};

module.exports = {
	raiselyEvents,
	mailchimpEvents,
};
