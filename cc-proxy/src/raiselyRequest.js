const request = require('request-promise-native');
const { omit } = require('lodash');

const raiselyUrl = 'https://api.raisely.com/v3';

const internalOptions = ['path', 'query', 'originalUser'];

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
	const token = process.env.APP_TOKEN;

	const uri = `${raiselyUrl}${options.path}`;

	const headers = createOriginalHeaders(options, req);
	Object.assign(headers, {
		'User-Agent': 'Climate Conversations Proxy',
		Authorization: `Bearer ${token}`,
	});

	const requestOptions = {
		...omit(options, internalOptions),
		uri,
		qs: options.query,
		headers,
		json: true,
	};

	const result = request(requestOptions);

	return result;
}

module.exports = raisely;
