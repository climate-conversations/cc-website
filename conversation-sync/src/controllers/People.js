const { AirblastController } = require('airblast');
const { raiselyEvents } = require('../../config/orchestrator');

// Airblast options
const options = {
	wrapInData: true,
	corsHosts: ['portal.climate.sg', 'p.climate.sg', 'portal.climateconversations.sg'],
};

/**
  * This controller will receive create, update, delete hooks from raisely
  * to update other services
  */
class RaiselyPeople extends AirblastController {
	async process({ data }) {
		const validEvents = Object.keys(raiselyEvents);
		if (!validEvents.includes(data.type)) {
			this.log(`Invalid event ${data.type} (ignoring)`);
			return;
		}

		// Defer to the orchestrator to decide which controllers should process
		// the event
		raiselyEvents[data.type].forEach(controller => {
			this.controllers[controller].enqueue(data);
		});
	}
}

RaiselyPeople.options = options;

module.exports = RaiselyPeople;
