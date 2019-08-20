const deasync = require('deasync');
const DatastoreEnvironment = require('datastore-env');
const envVars = require('./config/requiredEnv.js');

const options = {
	namespace, // Namespace for datastore
	projectId, // Defaults to the value of process.env.PROJECT_ID

	optional: envVars.optional,
	required: process.env.NODE_ENV === 'production' ? envVars.required : [],
};

const env = new DatastoreEnvironment(options);

// Wrap loadEnvironment in a node callback style
function asyncLoad(cb) {
    env.loadEnvironment().then(() => cb()).catch(cb);
}

// This will block until loadEnvironment has finished
deasync(asyncLoad)();
