
require('dotenv').config();

const DatastoreEnvironment = require('datastore-env');
const deasync = require('deasync');

// File generated above
const envVars = require('./requiredEnv.js');

const env = new DatastoreEnvironment(envVars);

// Wrap loadEnvironment in a node callback style
function asyncLoad(cb) {
	env.loadEnvironment().then(() => cb()).catch(cb);
}

// Block execution until loadEnvironment has finished
deasync(asyncLoad)();
