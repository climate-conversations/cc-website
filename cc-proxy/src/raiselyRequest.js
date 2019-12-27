const requestNative = require('request-promise-native');
const requestCache = require('request-promise-cache');
const { omit } = require('lodash');
const logger = require('./config/logging');

const raiselyUrl = 'https://api.raisely.com/v3';

const internalOptions = ['path', 'query', 'originalUser', 'cache'];

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
		...omit(options, internalOptions),
		uri,
		qs: options.query,
		headers,
		json: true,
	};

	logger.log('debug', `Raisely: ${uri}`, options);

	const request = options.cacheKey ? requestCache : requestNative;
	const result = request(requestOptions);

	return result;
}

module.exports = raisely;
