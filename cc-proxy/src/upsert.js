const raisely = require('./raiselyRequest');
const { get, pick, set } = require('lodash');
const shortUuid = require('short-uuid');
const RestError = require('./restError');
const assignRecord = require('./assignRecord');
const { authorize } = require('./proxy/permissions');

const permittedUpdateFields = ['private.host', 'private.volunteer', 'private.hostCorporate',
	'private.facilitate', 'private.newsletter', 'private.mailingList', 'private.organisationName',
	'private.attendedConversation', 'private.nycConsent', 'postcode'];
const permittedCreateFields = ['fullName', 'firstName', 'preferredName', 'lastName', 'email', 'phoneNumber',
	'private.alternateEmail', 'private.alternatePhone', 'private.source', ...permittedUpdateFields,
	'private.gender', 'private.ethnicity', 'private.dateOfBirth', 'residency'];

const actionFields = ['host', 'facilitate', 'volunteer', 'hostCorporate', 'newsletter', 'mailingList', 'attendedConversation'];

/**
 * Return only uuid, fullName and preferredName from a request that returns a user
 * @param {object} body Response body
 * @return {object} Transformed body
 */
function redactUser(original) {
	return function reductFn(body) {
		const { data } = body;

		const permitted = ['uuid', 'preferredName', 'fullName', 'email'];
		const optional = ['phoneNumber'];

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
}

/**
 * This is a helper when working with new/updated records to generalise
 * the boilerplate of deciding if it should be a create or update request
 * @param {string} model The name of the model to save
 * @param {object} record The record to update/create
 */
async function save(record, bodyParams, req) {
	if (!record) throw new Error('Record to save is undefined or null!');

	// Update will complain about updating uuid field
	if (record.uuid) {
		const data = pick(record, permittedUpdateFields);
		return raisely({
			method: 'PATCH',
			path: `/users/${record.uuid}`,
			body: {
				...bodyParams,
				data,
			},
			transform: redactUser(record),
			transform2xxOnly: true,
			escalate: true,
		}, req);
	}

	const data = pick(record, permittedCreateFields);

	return raisely({
		method: 'POST',
		path: '/users',
		body: {
			data,
		},
		transform: redactUser(record),
		transform2xxOnly: true,
		escalate: true,
	}, req);
}

async function findUserBy(attribute, record, req) {
	const query = { [attribute]: record[attribute] };
	query.private = 1;
	const body = await raisely({
		query,
		path: '/users',
		escalate: true,
	}, req);

	return body.data;
}

/**
 * Set alternate value for email or phone if primary is already
 * set to something different
 * If the primary or alternate value is not already the same as
 * the new primary value, put the old primary value in the alternate field
 * @param {object} existing Existing user record
 * @param {object} user Record to update with
 * @param {string} field Primary field
 * @param {string} alternate Alternate field
 */
function setAlternate(existing, user, field, alternate) {
	const primaryValue = get(existing, field);
	const newPrimary = get(user, field);
	if (primaryValue && newPrimary && primaryValue !== newPrimary) {
		const secondaryValue = get(existing, alternate);
		if (secondaryValue && secondaryValue !== newPrimary) {
			set(user, alternate, primaryValue);
		}
	}
}

/**
 * Gives accounts without an email a unique dummy email
 * Raisely requires all user records have emails so this
 * ensures all records can be stored
 *
 * If user.email is falsey assigns an email of the form `no-email-<random>@noemail.invalid`
 *
 * @param {object} user The user record
 */
function ensureEmail(user) {
	if (!user.email) {
		const shortRand = shortUuid();
		const unique = shortRand.new();
		// eslint-disable-next-line no-param-reassign
		user.email = `no-email-${unique}@noemail.invalid`;
	}
}

function prepareUserForSave(existing, user) {
	if (existing) {
		setAlternate(existing, user, 'email', 'private.alternateEmail');
		setAlternate(existing, user, 'phoneNumber', 'private.alternatePhone');
	} else {
		ensureEmail(user);
	}
	const privateKeys = Object.keys(get(user, 'private', {}));
	// Delete any action keys that are false so we don't overwrite existing
	actionFields.forEach((field) => {
		// eslint-disable-next-line no-param-reassign
		if (privateKeys.includes(field) && !user.private[field]) delete user.private[field];
	});
}

/**
 * Helper to perform upsert of user record
 * @param {object} record User
 * @param {boolean} requireEmail If set to false a dummy email will be generated for the user
 *  if missing an email
 */
async function upsertUser(req) {
	const record = req.body.data;
	if (!record) {
		throw new RestError({
			message: 'Request malformed. No body.data',
			status: 400,
		});
	}
	if (record.data) {
		throw new RestError({
			message: 'Request malformed. Data nested too deep (body.data.data)',
			status: 400,
		});
	}
	const { assignSelf, assignPointIfNew } = req.body;

	let originalUser;

	if (assignSelf) {
		const auth = await authorize(req, '/upsert/selfAssign');
		if (!auth || !auth.originalUser) {
			throw new RestError({
				message: 'User may not self assign',
				status: 403,
			});
		}
		({ originalUser } = auth);
	}

	let existing;
	if (!record.uuid) {
		const promises = [];
		if (record.email) promises.push(findUserBy('email', record, req));
		if (record.phoneNumber) promises.push(findUserBy('phoneNumber', record, req));

		// Find the first result that matches (assume email is a better match than phone)
		const existingCheck = await Promise.all(promises);
		[existing] = existingCheck.reduce((all, result) => all.concat(result), []);
		if (existing) {
			// eslint-disable-next-line no-param-reassign
			record.uuid = existing.uuid;
		}
	}
	prepareUserForSave(existing, record);
	// Assign point person if it's a new record
	if (assignPointIfNew && !existing) {
		record.private.recruitedBy = originalUser.uuid;
		record.private.pointPerson = originalUser.uuid;
	}

	const savePromise = save(record, { partial: 1, allowExists: true }, req);

	if (record.uuid && assignSelf) {
		await Promise.all([
			savePromise,
			assignRecord(req, record.uuid, originalUser.uuid),
		]);
	} else {
		const newRecord = (await savePromise).data;
		if (assignSelf) {
			await assignRecord(req, newRecord.uuid, originalUser.uuid);
		}
	}
	return savePromise;
}

module.exports = {
	findUserBy,
	prepareUserForSave,
	save,
	upsertUser,
};
