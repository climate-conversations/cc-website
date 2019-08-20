const { pick } = require('lodash');

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
