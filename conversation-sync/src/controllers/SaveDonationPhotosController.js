/* eslint-disable class-methods-use-this */
const tzc = require("timezonecomplete");
const { PassThrough } = require("stream");
const { AirblastController } = require("airblast");
const request = require("request-promise-native");
const { authorize, uploadFile } = require("../services/googleDrive");
const { fetchTeam } = require("../helpers/raiselyConversationHelpers");
const { isoToSgDateAndTime } = require('../helpers/dateHelpers')

const options = {
	wrapInData: true,
};

const folders = {
	transfer: "1zmzrrRv4zT6_JfZ5b6LoDKFbkhnE_GgV",
	report: "1j1-SFY90IZK0Js2h-GCy4wPhG9xEmMsB",
};

function getName(user) {
	return user.fullName || user.preferredName;
}

function createFileName({ facilitator, host, conversation, type }) {
	const startAt = isoToSgDateAndTime(conversation.startAt).date;
	const name = `${startAt} - ${type} - host ${getName(
		host
	)} - facil ${getName(facilitator)}`;
	return name;
}

/**
 * This controller will receive create, update, delete hooks from raisely
 * to update other services
 */
class SaveDonationPhotos extends AirblastController {
	async process({ data }) {
		if (data.type === "conversation.donationReportUploaded")
			return this.saveToGoogleDrive(data.data);
		this.log(`Unknown event type ${data.type}, ignoring`);
		return null;
	}

	async saveToGoogleDrive({ url, type, conversation }) {
		const validTypes = ['report', 'transfer'];
		if (!validTypes.includes(type)) {
			this.log(`Unknown report type ${type}, ignoring`);
			return;
		}

		// Authorize access to google drive
		// Fetch conversation team
		const [jwt, team] = await Promise.all([
			authorize(),
			fetchTeam(conversation.uuid),
		]);
		const { facilitator, host } = team;

		const name = createFileName({ conversation, facilitator, host, type });
		const folder = folders[type];

		const metadata = {
			name,
			parents: [folder],
		};

		// Pipe the file directly through to google
		const buffer = new PassThrough();
		request(url).pipe(buffer);

		const media = {
			// mimeType: 'text/plain',
			body: buffer,
		};

		const res = await uploadFile(jwt, metadata, media);

		this.log(
			`Photo (${type}) saved to drive: ${name}, (conversation uuid: ${
				conversation.uuid
			})`
		);
		return res;
	}
}

SaveDonationPhotos.options = options;

module.exports = SaveDonationPhotos;
