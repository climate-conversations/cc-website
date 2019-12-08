const { AirblastController } = require('airblast');

const options = {
	wrapInData: true,
};

/**
  * This controller will receive create, update, delete hooks from raisely
  * to update other services
  */
class RaiselyPeople extends AirblastController {
	async process({ data }) {
		// Put data on myTask's job queue
		this.controllers.mailchimp.enqueue(data);
	}
}

RaiselyPeople.options = options;

module.exports = RaiselyPeople;
