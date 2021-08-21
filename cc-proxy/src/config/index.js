console.log('Loading environment');

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
async function asyncLoad(cb) {
	console.log('running async load environment');

	return env
		.loadEnvironment()
		.then(() => {
			console.log('loading done');
			// cb();
		})
		.catch((err) => {
			console.log('error!');
			console.error(err);
			// cb(err);
		});
}

module.exports = asyncLoad;
