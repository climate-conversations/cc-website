const _ = require('lodash')
const requestNative = require('request-promise-native');
const requestCache = require('request-promise-cache');

const raiselyUrl = 'https://api.raisely.com/v3';

const internalOptions = ['path', 'query', 'token', 'data'];

/**
 * Find a raisely field that might be public or private
 * Similar to lodash.get
 *
 * @example
 * const key = 'user.field';
 * const simple = { user: { field: 'found native' }};
 * const inPrivate = { user: { private: { field: 'found private' }}};
 * const inPublic = { user: { public: { field: 'found public' }}};
 * const a = getField(simple, key);
 * const b = getField(inPrivate, key);
 * const c = getField(inPublic, key);
 * console.log(a, b, c); // 'found native', 'found private', 'found public'
 *
 * @param {object} data Contains one or more nested records
 * @param {string} key Of the form 'user.field'
 * @param {*} defaultValue Default value if value is not found
 * @returns {*} The value found
 */
function getField(data, key, defaultValue) {
	let value = _.get(data, key);
	if (value === undefined && !key.includes('.public.') && !key.includes('.private.')) {
		const [recordName] = key.split('.');
		const fieldName = key.split(`${recordName}.`)[1];
		value = _.get(data, `${recordName}.private.${fieldName}`);
		if (value === undefined) value = _.get(data, `${recordName}.public.${fieldName}`);
	}
	return value === undefined ? defaultValue : value;
}

/**
 * Populate a spreadsheet row from one or more raisely objects
 * Will attempt to find fields at the top of the record, but if not
 * present will check if they are nested within private/public
 * eg 'user.field' will look for user.field, user.private.field, user.public.field
 *
 * @param {object} data Nested raisely objects that could be accessed by _.get()
 * @param {object} headerMap Map from raisely keys to headers
 * @return {object} object with headers as keys that can be passed to google sheets
 */
function raiselyToRow(data, headerMap) {
	const row = {};
	_.forEach(headerMap, (label, key) => {
		const value = getField(data, key);
		_.set(row, label, value);
	});

	return row;
}

/**
 *
 * @param {string} options.path Path to send request to (eg /users)
 * @param {string|object} options.query
 * @param {object} options.body
 */
async function raiselyRequest(options) {
	const token = options.token;

	const uri = options.path.startsWith('http') ?
		options.path :
		`${raiselyUrl}${options.path}`;

	const headers = Object.assign({
		'User-Agent': 'Climate Conversations Message Pipe',
		Authorization: `Bearer ${token}`,
	}, options.headers);

	const requestOptions = {
		qs: options.query,
		..._.omit(options, internalOptions),
		uri,
		headers,
		json: true,
	};

	const method = requestOptions.method && requestOptions.method.toLowerCase();
	if (!method || ['get', 'delete'].includes(method)) {
		delete requestOptions.body;
	} else if (options.data) {
		requestOptions.body = { data: options.data };
	}

	const request = options.cacheKey ? requestCache : requestNative;
	let retries = 3;
	do {
		try {
			retries -= 1;
			const result = await request(requestOptions);

			return options.fullResult ? result : result.data;
		} catch (error) {
			// Gateway failure, retry
			console.log('Status code', error.statusCode, typeof error.statusCode);
			if (retries === 0 || parseInt(error.statusCode) < 500) throw error;
			console.log(`Got ${error.statusCode} error, retrying`);
		}
	} while (retries);
}


module.exports = {
	getField,
	raiselyToRow,
	raiselyRequest,
}
