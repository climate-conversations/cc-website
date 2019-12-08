const Airblast = require('airblast');

const Controllers = require('../src/controllers');

const config = {
	datastore: {},
	pubsub: {},
	// Authenticate can also be a function
	authenticate: process.env.AUTH_TOKEN,
	// eslint-disable-next-line no-console
	log: console.log,
};

const controllers = Controllers(config);

module.exports = Airblast.routes(controllers)
	// Disable other routes for now
	.filter(r => r.path.includes('eople') || r.path.includes('chimp'));
