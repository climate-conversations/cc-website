const fs = require('fs/promises');
const path = require('path');

const requestNative = require('request-promise-native');
const _ = require('lodash');

const raiselyUrl = 'https://api.raisely.com/v3';

// check version of stylesheet from prior to the most recent commit (check the local folder)
// check if production version is the same
// check last updated? if production is updated earlier, means we want to merge changes
// from local to production

// stylesheets are named after the campaign path

async function raisely(options) {
	const token = process.env.APP_TOKEN;

	const internalOptions = ['path', 'query'];

	const uri = `${raiselyUrl}${options.path}`;

	const headers = {
		'User-Agent': 'Component Sync Util',
		// Pass through original authorization if the user is not escalated
		Authorization: `Bearer ${token}`,
	};

	const requestOptions = {
		qs: options.query,
		..._.omit(options, internalOptions),
		uri,
		headers,
		json: true,
	};

	const method = requestOptions.method && requestOptions.method.toLowerCase();
	if (!method || ['get', 'delete'].includes(method))
		delete requestOptions.body;

	const request = requestNative;
	const result = request(requestOptions);

	return result;
}

async function syncStyleSheets() {
	const stylesheetsDir = './stylesheets';

	console.log('loading list of stylesheets to sync');
}
