const Airblast = require('airblast');

const Controllers = require('../src/controllers');

const config = {
	datastore: {},
	pubsub: {},
	// eslint-disable-next-line no-console
	log: console.log,
};

const controllers = Controllers(config);

module.exports = Airblast.routes(controllers);
