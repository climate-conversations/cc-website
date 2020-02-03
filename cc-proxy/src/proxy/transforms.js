const { get, pick, set } = require('lodash');

/**
 * These functions transform the response from the proxy
 */

/**
 * Return only uuid and preferredName from a request that returns a user
 * @param {object} body Response body
 * @return {object} Transformed body
 */
function minimalUser(body, original = {}) {
	const { data } = body;

	const permitted = ['uuid', 'preferredName'];
	const optional = ['fullName', 'email', 'phoneNumber'];

	const user = pick(data, permitted)
	optional.forEach(key => {
		const value = get(data, key);
		if ((typeof value !== 'undefined') && (get(original, key) === value)) {
			set(user, key, value);
		}
	})

	return {
		data: user,
	};
}

module.exports = {
	minimalUser,
};
