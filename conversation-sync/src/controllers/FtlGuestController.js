const { AirblastController } = require('airblast');

const { syncGuestToFtl } = require('../processors/ftl');

class FtlGuestController extends AirblastController {
	async process(data) {
		const guest = await this.load(data.guestKey);

		return syncGuestToFtl(guest);
	}
}

module.exports = FtlGuestController;
