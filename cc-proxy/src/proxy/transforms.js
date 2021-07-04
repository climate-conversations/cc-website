const { get, pick, set } = require('lodash');

/**
 * These functions transform the response from the proxy
 */

/**
 * Return only uuid, fullName and preferredName from a request that returns a user
 * @param {object} body Response body
 * @return {object} Transformed body
 */
function minimalUser(body) {
	const { data } = body;

	const permitted = ['uuid', 'preferredName', 'fullName'];

	if (Array.isArray(data)) {
		return {
			data: data.map(u => pick(u, permitted))
		}
	}

	const user = pick(data, permitted)

	return {
		data: user,
	};
}

module.exports = {
	minimalUser,
};
