const { promisify } = require('util');
const Airtable = require('airtable');
const _ = require('lodash');

Airtable.configure({
	endpointUrl: 'https://api.airtable.com',
	apiKey: process.env.AIRTABLES_KEY,
});

const base = Airtable.base(process.env.AIRTABLES_BASE);

async function find(table, search = {}) {
	const queries = Object.keys(search).map(key => `{${key}}='${search[key]}'`);

	const opts = { maxRecords: 3 };

	if (queries.length) {
		opts.filterByFormula = (queries.length > 1) ? `AND(${queries.join(',')})` : queries[0];
	}

	const selectQuery = base(table).select(opts);
	const firstPage = promisify(selectQuery.firstPage);
	return firstPage.call(selectQuery);
}

async function create(table, data) {
	const tableObject = base(table);
	const body = Object.assign({}, data);
	// Convert special objects denoting array merging
	Object.keys(body).forEach((key) => {
		const value = body[key];
		if (_.isObject(value)) {
			body[key] = [value.record];
		}
	});

	const createFn = promisify(tableObject.create);
	return createFn.call(tableObject, data);
}

async function update(table, record, data, overwrite) {
	let body;

	if (overwrite) {
		const changedKeys = Object.keys(data).filter(key => (_.isEqual(record.fields[key], data[key])));
		if (!changedKeys.length) {
			console.debug(`airtables.updateRecord ${record.id}: All new values are the same as existing values, skipping`);
			return record;
		}
		body = data;
	} else {
		// Find the keys in data that aren't already set in record if we're not overwriting
		const keysToSet = Object.keys(data)
			.filter(key => !(record.fields[key] && record.fields[key].length));
		if (!keysToSet.length) {
			console.debug(`airtables.updateRecord ${record.id}: No unset keys to update and overwrite is false, skipping`);
			return record;
		}

		body = _.pick(data, keysToSet);
	}

	// Handle merging arrays of linked records
	Object.keys(body).forEach((key) => {
		const obj = _.isObject(data[key]);
		if (obj) {
			// If it should be set, or there's no existing value, simply set it
			if (obj.method === 'add') {
				if (!(record.fields[key] && record.fields[key].length)) {
					body[key] = [obj.record];
				} else {
					body[key] = record.fields[key].splice().push(obj.record);
				}
			}
		}
	});

	const tableObject = base(table);
	const updateFn = promisify(tableObject.create);
	return updateFn.call(tableObject, record.id, body);
}

async function upsert(table, search, data, overwrite) {
	const records = await find(table, search);
	if (records.length > 1) throw new Error('More than one record matched search. Cannot upsert');

	if (records.length) {
		const [record] = records;
		return update(table, record, data, overwrite);
	}

	return create(table, data);
}

module.exports = {
	create,
	find,
	update,
	upsert,
};
