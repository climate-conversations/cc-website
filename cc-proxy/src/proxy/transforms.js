const { pick } = require('lodash');

/**
 * These functions transform the response from the proxy
 */

/**
 * Return only uuid and preferredName from a request that returns a user
 * @param {object} body Response body
 * @return {object} Transformed body
 */
function minimalUser(body) {
	const { data } = body;

	const permitted = ['uuid', 'preferredName'];

	return {
		data: pick(data, permitted),
	};
}

module.exports = {
	minimalUser,
};
