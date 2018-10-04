const types = require('./keplaTypes');
const fetch = require('node-fetch');
const _ = require('lodash');

/**
  * perform a request to kepla with the necessary headers
  * @param {string} url The url
  * @param {object} opts Request options (see node-fetch )
  * @returns {object} The resulting JSON body
  */
async function keplaRequest(url, opts = {}) {
	const authKey = process.env.KEPLA_KEY;

	if (!opts.headers) opts.headers = {};
	if (!opts.headers.Authorization) opts.headers.Authorization = `Bearer ${authKey}`;

	if (opts.body) opts.headers['Content-Type'] = 'application/json';
	if (_.isObject(opts.body)) opts.body = JSON.stringify(opts.body);

	const res = await fetch(url, opts);
	return res.json();
}

/**
  * @param {string} typeName The name of the type to create (conversation or person)
  * @param {object} payload The record to create, kepla field labels will be translated to field ids
  * @return {object} the new record
  */
async function createRecord(typeName, payload) {
	const typeId = types.getTypeId(typeName);

	const url = `https://api.kepla.com/v1/types/${typeId}/records?update=true`;

	const body = types.keysToKeplaFieldIds(typeId, payload);

	return keplaRequest(url, { method: 'POST', body });
}

/**
  * @param {object} record The existing record, fetched from kepla previously
  * @param {object} payload The data to update the record with
  * @param {boolean} overwrite If false, then only keys in payload that do not exist
  * in record will be sent as part of the update
  * @returns {object} The updated record
  */
async function updateRecord(record, payload, overwrite) {
	const { typeId } = record;
	const data = types.keysToKeplaFieldIds(typeId, payload);

	let body;
	const url = `https://api.kepla.com/v1/types/${typeId}/records/${record.id}`;

	if (overwrite) {
		body = data;
	} else {
		// Find the keys in data that aren't already set in record if we're not overwriting
		const keysToSet = Object.keys(data).filter(key => !record[key]);
		if (!keysToSet.length) {
			console.debug(`kepla.updateRecord ${record.id}: No unset keys to update and overwrite is false, skipping`);
			return record;
		}

		body = _.pick(data, keysToSet);
	}

	return keplaRequest(url, { method: 'PUT', body });
}

/**
  * Used to create or update a person record
  * NOTE: This is not atomic. Does a separate find and create/update
  * @param {string} email The email address of the person
  * (checks main and alternative when searching)
  * @param {object} data The data of the record to create/update
  * @param {boolean} overwrite If false, only attributes
  * that are not already set will be updated on the record
  * @returns {object} The upserted record
  */
async function upsertPerson(email, data, overwrite) {
	const record = await findPersonByEmail(email);
	if (!record) {
		return createRecord('person', data);
	}

	return updateRecord(record, data, overwrite);
}

async function upsertConversation(options) {
	// eslint-disable-next-line
	const { date, facilitator, host, status } = options;

	const typeId = types.getTypeId('conversation');
	const dateField = types.getFieldId({ typeId, label: 'Date of Gathering' });
	const hostField = types.getFieldId({ typeId, label: 'Host' });
	const facilitatorField = types.getFieldId({ typeId, label: 'Facilitator' });
	const statusField = types.getFieldId({ typeId, label: 'Status' });

	const findUrl = `https://api.kepla.com/v1/types/${typeId}/search?q=${hostField}:${host.id}`;
	let saveUrl = `https://api.kepla.com/v1/types/${typeId}/records`;

	const conversations = (await keplaRequest(findUrl)).records;
	let conversation = conversations.find(conv => conv[dateField] === date);


	if (conversation) {
		if (status && (conversation[statusField] !== status)) {
			saveUrl += conversation.id;
			const body = { [statusField]: status };
			conversation = await keplaRequest(saveUrl, { body, method: 'PUT' });
		}
	} else {
		const body = {
			[dateField]: date,
			[hostField]: host.id,
			[facilitatorField]: facilitator.id,
			[statusField]: status,
		};
		conversation = await keplaRequest(saveUrl, { body, method: 'POST' });
	}
	return conversation;
}

/**
  * Find a person by email in kepla
  * @param {string} email the email of the person to find
  * @returns {object} The record from kepla or undefined
  */
async function findPersonByEmail(email) {
	// This code should search primary and secondary emails
	const url = `https://api.kepla.com/v1/types/7c12b42d-26eb-43c7-a3d1-25045869cbf6/search?q=Hy5iBgCkb:${email}&limit=50&offset=0&filter=all&count=estimate`;

	const result = await keplaRequest(url);
	const people = result.records;

	const person = people[0];

	return person;
}

/**
  * Assign a user to be responsible for a record
  * @param {object} user Kepla user record
  * @param {object} record Kepla record (person/conversation)
  */
async function assignUserToRecord(user, record) {
	// FIXME check if user is already in record users and skip

	const recordId = record.id;
	const userId = user.id;
	const { typeId } = record;

	const typeName = types.getTypeName(typeId);

	const assigned = record.users.find(u => u.id === user.id);

	if (assigned) {
		console.trace(`${user.name} already assigned to ${typeName} ${recordId}, skipping`);
		return null;
	}

	const url = `https://api.kepla.com/v1/types/${typeId}/records/${recordId}/users/${userId}`;

	return keplaRequest(url, { method: 'PUT' });
}

/**
  * Map residency field to a value accepted by kepla
  * @param {string} residency
  * @returns {string} Residency best guess, or 'Other'
  */
function mapToKeplaResidency(residency) {
	const validPass = ['Singapore Citizen', 'Employment Pass Holder', 'Permanent Resident', 'Dependents Pass', 'Other'];

	const dependentsPass = ['dp', 'dependents pass', 'dependants pass', 'dependent pass', 'dependant pass'];

	if (residency) {
		if (!validPass.includes(residency)) {
			if (dependentsPass.includes[residency.toLowerCase()]) {
				// eslint-disable-next-line no-param-reassign
				residency = 'Dependents Pass';
			} else {
				// eslint-disable-next-line no-param-reassign
				residency = 'Other';
			}
		}
	}

	return residency;
}


module.exports = {
	findPersonByEmail,
	upsertPerson,
	upsertConversation,
	assignUserToRecord,
	mapToKeplaResidency,
};
