const { AirblastController } = require('airblast');
const { raiselyEvents } = require('../../config/orchestrator');

// Airblas options
const options = {
	wrapInData: true,
};

/**
  * This controller will receive create, update, delete hooks from raisely
  * to update other services
  */
class RaiselyEvents extends AirblastController {
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

RaiselyEvents.options = options;

module.exports = RaiselyEvents;
