const { get } = require('lodash');

const { upsertUser } = require('./upsert');
const proxy = require('./proxy');

require('./config');

/**
 * Middleware for setting CORS headers
 * @param {*} req
 * @param {*} res
 * @returns {boolean} true if the request is an OPTIONS request,
 * indicating no further response is needed
 */
function setCORS(req, res) {
	// Set CORS headers for preflight requests
	res.set('Access-Control-Allow-Credentials', 'true');

	const validOrigins = [
		'raisely.com',
		'climateconversations.sg',
		'climate.sg',
	];

	const origin = req.get('Origin');
	if (origin) {
		validOrigins.forEach((validOrigin) => {
			if (origin.endsWith(validOrigin)) {
				res.set('Access-Control-Allow-Origin', origin);
			}
		});
	}

	if (req.method === 'OPTIONS') {
		// Send response to OPTIONS requests
		res.set('Access-Control-Allow-Methods', 'GET,HEAD,POST,PUT,PATCH');
		res.set('Access-Control-Allow-Headers', 'Access-Control-Allow-Headers, Origin, Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers');

		res.set('Access-Control-Max-Age', '3600');
		res.status(204).send('');
		return true;
	}
	// not an OPTIONS request
	return false;
}

/**
 * Wrapper for requests
 * The passed function is expected to follow the convention
 * of request-promise-native
 * That is, it either returns a JSON object for the body
 * to return, or throws an error
 * @param {async function} fn Function to handle request
 */
function wrap(fn) {
	return async function requestPassThrough(req, res) {
		try {
			// If it's an OPTIONS request, send CORS and return
			if (setCORS(req, res)) return;

			const result = await fn(req, res);
			res
				.status(200)
				.send(result);

			const user = get(req, 'authentication.user', '<public>');
			console.log(`${res.statusCode} ${req.method} ${user} ${req.url}`);
		} catch (error) {
			const user = get(req, 'authentication.user', '<public>');
			console.log(`${res.statusCode} ${req.method} ${user} ${req.url}`);

			const status = error.statusCode || 500;
			const errorData = get(error, 'response.body', {
				errors: [{
					status,
					message: error.message,
					code: error.code || 'proxy-error',
				}],
			});

			if (['test', 'development'].includes(process.env.NODE_ENV)) {
				errorData.errors[0].stack = error.stack;
			}

			res
				.status(status)
				.send(errorData);
		}
	};
}

const functions = {
	proxy,
	upsertUser,
};

const proxiedFunctions = {};

Object.keys(functions).forEach((fn) => { proxiedFunctions[fn] = wrap(functions[fn]); });

module.exports = proxiedFunctions;
