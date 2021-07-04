/* eslint-disable class-methods-use-this */
const tzc = require('timezonecomplete');
const { PassThrough } = require('stream');
const { AirblastController } = require('airblast');
const request = require('request-promise-native');
const { authorize, uploadFile } = require('../services/googleDrive');
const { fetchTeam } = require('../helpers/raiselyConversationHelpers');
const { isoToSgDateAndTime } = require("../helpers/dateHelpers");

const options = {
	wrapInData: true,
};

const folders = {
	withConsent: '1afJ14TG6f66tjMkCwssm_MnQoD3i2PLG',
	withoutConsent: '1AutV3Usgk9mBxkm8N8GAWSGVFQ3srcQw',
}

function getName(user) {
	return user.fullName || user.preferredName;
}

function createFileName({ facilitator, host, conversation }) {
	const startAt = isoToSgDateAndTime(conversation.startAt).date;
	const name = `${startAt} - ${conversation.uuid} - host ${getName(host)} - facil ${getName(
		facilitator
	)}`;
	return name;
}

/**
  * This controller will receive create, update, delete hooks from raisely
  * to update other services
  */
class SavePhoto extends AirblastController {
	async process({ data }) {
		if (data.type === 'conversation.photoUploaded') return this.saveToGoogleDrive(data.data);
		this.log(`Unknown event type ${data.type}, ignoring`);
		return null;
	}

	async saveToGoogleDrive({ url, photoConsent, conversation }) {
		// Authorize access to google drive
		// Fetech conversation team
		const [jwt, team] = await Promise.all([
			authorize(),
			fetchTeam(conversation.uuid),
		]);
		const { facilitator, host } = team;

		const name = createFileName({ conversation, facilitator, host });
		const folder = photoConsent ? folders.withConsent : folders.withoutConsent;

		const metadata = {
			name,
			parents: [folder],
		};

		// Pipe the file directly through to google
		const buffer = new PassThrough()
		request(url).pipe(buffer);

		const media = {
			// mimeType: 'text/plain',
			body: buffer,
		};

		const res = await uploadFile(jwt, metadata, media);

		this.log(`Photo (${photoConsent ? 'with consent' : 'without consent'}) saved to drive: ${name}, (conversation uuid: ${conversation.uuid})`);
		return res;
	}
}

SavePhoto.options = options;

module.exports = SavePhoto;
