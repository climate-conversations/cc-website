const { get } = require('lodash');

const { upsertUser } = require('./upsert');
const proxy = require('./proxy');

const logger = require('./config/logging');

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
 * Helper to log the request
 * @param {string} name Name of the function
 * @param {Request} req The request
 * @param {int} status Status code of the response
 */
function log(name, req, status, meta = {}, level = 'info') {
	const user = get(req, 'authentication.user', '<public>');
	const message = `/${name}/${status} ${req.method} ${user} ${req.originalUrl}`;
	logger.log(level, message, meta);
}

/**
 * Wrapper for requests
 * The passed function is expected to follow the convention
 * of request-promise-native
 * That is, it either returns a JSON object for the body
 * to return, or throws an error
 * @param {async function} fn Function to handle request
 */
function wrap(fn, name) {
	return async function requestPassThrough(req, res) {
		try {
			// If it's an OPTIONS request, send CORS and return
			if (setCORS(req, res)) return;

			const result = await fn(req, res);
			res
				.status(200)
				.send(result);

			log(name, req, res.statusCode);
		} catch (error) {
			const status = error.status || error.statusCode || 500;
			const meta = Object.assign({}, error.meta, {
				error,
				body: req.body,
			});
			log(name, req, status, meta, 'error');

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

Object.keys(functions).forEach((fn) => { proxiedFunctions[fn] = wrap(functions[fn], fn); });

module.exports = proxiedFunctions;
