const fs = require('fs');
const GoogleDrive = require('./driveProvider');

function getJwtClient() {
	const { GOOGLE_PROJECT_CREDENTIALS } = process.env;
	const credentialsJSON = fs.readFileSync(GOOGLE_PROJECT_CREDENTIALS);
	 var credentials = JSON.parse(credentialsJSON);

	const { google } = GoogleDrive.load();

	return new google.auth.JWT(
		credentials.client_email,
		null,
		credentials.private_key,
		['https://www.googleapis.com/auth/drive'],
		null
	);
}

/**
 * Authorize the service account to access shared drive folders
 * @return {Promise} Resolved with authorized jwtClient object
 */
async function authorize() {
	const jwtClient = getJwtClient();
	await jwtClient.authorize();
	return jwtClient;
}

/**
 * Upload a file to google drive
 * @param {*} jwtClient obtained from authorize()
 * @param {object} metadata filename and folder (as per file.create api)
 * @param {object} media optional mimetype and readable stream
 */
async function uploadFile(jwtClient, metadata, media) {
	const { drive } = GoogleDrive.load();
	const newFile = await drive.files.create({
		auth: jwtClient,
		resource: metadata,
		media,
		fields: 'id, name',
	});
	return newFile;
}

module.exports = {
	authorize,
	uploadFile,
};
