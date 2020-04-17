const requestNative = require('request-promise-native');
const requestCache = require('request-promise-cache');
const { omit } = require('lodash');
const logger = require('./config/logging');

const raiselyUrl = 'https://api.raisely.com/v3';

const internalOptions = ['path', 'query', 'originalUser', 'cache', 'token', 'escalate'];

function createOriginalHeaders(options, req) {
	const headers = {
		'X-Forwarded-For': req.get('X-Forwarded-For'),
		'X-Original-User': options.originalUser || '(general public)',
		'X-Original-User-Agent': req.get('User-Agent'),
		'X-CC-Proxy-Url': req.originalUrl,
		Origin: req.get('Origin'),
		Referer: req.get('Referer'),
	};

	const originalAuthorization = req.get('Authorization');
	if (originalAuthorization) headers['X-Original-Authorization'] = originalAuthorization;

	return headers;
}

/**
 *
 * @param {string} options.path Path to send request to (eg /users)
 * @param {string|object} options.query
 * @param {object} options.body
 * @param {object} options.originalUser uuid of the original user that made the request
 * @param {string} options.cacheKey If present, the result will be cached using this key (or return the previously cached value)
 * @param {Request} req The original express request
 */
async function raisely(options, req) {
	const token = options.token || process.env.APP_TOKEN;

	const uri = `${raiselyUrl}${options.path}`;

	const headers = createOriginalHeaders(options, req);
	Object.assign(headers, {
		'User-Agent': 'Climate Conversations Proxy',
		// Pass through original authorization if the user is not escalated
		Authorization: options.escalate ? `Bearer ${token}` : req.get('Authorization'),
	});

	const requestOptions = {
		qs: options.query,
		...omit(options, internalOptions),
		uri,
		headers,
		json: true,
	};

	const method = requestOptions.method && requestOptions.method.toLowerCase();
	if (!method || ['get', 'delete'].includes(method)) delete requestOptions.body;

	logger.log('debug', `Raisely: ${uri}`, requestOptions);

	const request = options.cacheKey ? requestCache : requestNative;
	const result = request(requestOptions);

	return result;
}

module.exports = raisely;
