const _ = require('lodash');
const timezone = require('timezonecomplete');
const uuidValidate = require('uuid-validate');

/**
  * Validates an object against the given schema
  * Validates against this.validate object, each key should correspond to
  * a key (or nested key) in the record and the values should be either
  * * a function that returns a falsey value if validation fails,
  * * an exact value to match
  * * an array of exact values to match
  * dot notation can be used to specify nested properties
  *
  * @example
  * const schema = {
  *   type: 'relative', // record.type === 'relative'
  *   name: ['George', 'Finn'], // ['George', 'Finn'].includes(record.name)
  *   age: _.isNumber, // _.isNumber(record.age)
  *	  'address.street': validate.optional(_.isString),
  * }
  * validate(schema, record);
  */
function validate(schema, record) {
	const errors = [];
	const modelName = record.constructor ? record.constructor.name : 'record';

	Object.keys(schema).forEach((key) => {
		const val = _.get(record, key);
		const validator = schema[key];
		const keyName = `${modelName}.${key}`;

		try {
			if (_.isFunction(validator)) {
				if (!validator(val, keyName)) {
					errors.push(`${keyName} failed ${validator.name}() check`);
				}
			} else if (_.isArray(validator)) {
				if (!validator.includes(val)) {
					errors.push(`${keyName} must be one of ${validator.join(',')}`);
				}
			} else if (val !== validator) {
				errors.push(`${keyName} must be one of ${validator}`);
			}
		} catch (e) {
			errors.push(e.message);
		}
	});

	if (errors.length) {
		const error = new Error(`${modelName} is not valid: ${errors.join('\n')}`);
		error.errors = errors.map(message => ({
			code: 'invalid attribute',
			message,
		}));
		throw error;
	}
}

/**
  * Validate only if value is present
  */
function optional(validator) {
	return (value, field) => (value ? validator(value, field) : true);
}

/**
  * Validate that the value is a valid timezone
  */
function validateTimezone(tz) {
	if (!timezone.TzDatabase.instance().zoneNames().includes(tz)) {
		throw new Error(`${tz} is not a valid timezone`);
	}
	return true;
}

function isString(val, field) {
	if (!_.isString(val)) {
		throw new Error(`${field} must be a string`);
	}
	return true;
}

function isUuid(val, field) {
	if (!uuidValidate(val)) {
		throw new Error(`${field} must be a uuid`);
	}
	return true;
}

/**
  * Generates a validator that checks that the value is a comma separated
  * list that contains only values in the given array
  * messageStat types
  * @param {string[]} validValues Comma separated list of types
  * @returns {function} true if valid
  * @example
  * const validRecord = {
  *		fruit: validate.stringList(['apple','orange','guava']),
  * }
  * validate(validRecord, { fruit: 'apple,orange' }) // Valid
  * validate(validRecord, { fruit: 'apple' }) // Valid
  * validate(validRecord, { fruit: 'hovercraft' }) // Throws error
  */
function stringList(valid) {
	return (value, field) => {
		const badTypes = value
			.split(',')
			.map(t =>
				// Return the name of types that are invalid
				(valid.includes(t) ? false : t))
			// Remove nulls
			.filter(t => t);

		if (badTypes.length) throw new Error(`${badTypes.join(',')} are not valid values for ${field}`);

		return true;
	};
}

/**
  * Validates an ISO8601 date
  */
function isIsoDate(val, field) {
	try {
		// eslint-disable-next-line no-new
		new timezone.DateTime(val);
	} catch (e) {
		if (e.message.startsWith('Invalid ISO 8601 string')) {
			throw new Error(`${field} must be a valid ISO8601 date (got ${val})`);
		}
		throw e;
	}
	return true;
}

/**
  * Validates a 24 hour time in the form HH:mm
  */
function isTime(val, field) {
	try {
		// eslint-disable-next-line no-new
		new timezone.DateTime(val, 'HH:mm');
	} catch (e) {
		if (e.message.startsWith('invalid date')) {
			throw new Error(`${field} must be a valid time in the form HH:mm (got ${val})`);
		}
		throw e;
	}
	return true;
}

Object.assign(validate, {
	optional,
	isIsoDate,
	isString,
	isTime,
	isUuid,
	stringList,
	validateTimezone,
});

module.exports = validate;
