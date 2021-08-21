require('dotenv').config();

const DatastoreEnvironment = require('datastore-env');
const envVars = require('./requiredEnv.js');

const options = {
	// namespace, // Namespace for datastore
	// projectId, // Defaults to the value of process.env.PROJECT_ID

	optional: envVars.optional,
	required: envVars.required,
};

const env = new DatastoreEnvironment(options);

// Wrap loadEnvironment in a node callback style
async function asyncLoad() {
	console.log('running async load environment');

	return env.loadEnvironment();
}

module.exports = asyncLoad;
