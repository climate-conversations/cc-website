
console.log('before dotenv', process.env)

require('dotenv').config();

console.log('after dotenv', process.env)

const DatastoreEnvironment = require('datastore-env');
const deasync = require('deasync');

// File generated above
const envVars = require('./requiredEnv.js');

const env = new DatastoreEnvironment(envVars);

// Wrap loadEnvironment in a node callback style
function asyncLoad(cb) {
	env.loadEnvironment().then(() => cb()).catch(cb);
}

console.log('just before', process.env)

// Block execution until loadEnvironment has finished
deasync(asyncLoad)();
