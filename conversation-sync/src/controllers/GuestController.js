const { AirblastController } = require('airblast');

const validate = require('../helpers/validate');
const { sheetsToIsoDate, dateKeys } = require('../helpers/dateHelpers');

const payloadSchema = {
	hostemailaddress: validate.isString,
	facilitatoremailaddress: validate.isString,
};

class GuestController extends AirblastController {
	// eslint-disable-next-line class-methods-use-this
	async validate({ data }) {
		renameGsxKeys(data);

		validate(payloadSchema, data);

		// Convert dates to iso
		if (!data.conversationdate) throw new Error('Cannot process a conversation that does not have a date');
		dateKeys.forEach((key) => {
			data[key] = data[key] ? sheetsToIsoDate(data[key]) : null;
		});
	}

	// eslint-disable-next-line class-methods-use-this
	async process({ key }) {
		const promises = [
			this.controllers.ftlGuest.enqueue({ guestKey: key }),
			this.controllers.keplaGuest.enqueue({ guestKey: key }),
		];

		try {
			await Promise.all(promises);
		} finally {
			// eslint-disable-next-line no-console
			Promise.all(promises.map(p => p && p.catch(console.error)));
		}
	}
}

/**
  * Remove gsx$ from google sheet data keys
  * @param {object} data Original data from google sheets
  * NOTE: Modifies the existing data object
  */
function renameGsxKeys(data) {
	Object.keys(data).forEach((k) => {
		const newKey = k.split('gsx$').join('');

		if (data[newKey]) throw new Error(`Key exists! Won't overwrite ${newKey}`);

		data[newKey] = data[k];

		delete data[k];
	});
}

module.exports = GuestController;
