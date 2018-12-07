const { AirblastController } = require('airblast');

const { syncGuestToKepla } = require('../processors/kepla');

class KeplaGuestController extends AirblastController {
	async process(data) {
		const guest = await this.load(data.guestKey);

		return syncGuestToKepla(guest);
	}
}

module.exports = KeplaGuestController;
