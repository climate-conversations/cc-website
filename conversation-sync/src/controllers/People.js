const { AirblastController } = require('airblast');
const { raiselyEvents } = require('../../config/orchestrator');
const { raiselyRequest } = require('../helpers/raiselyHelpers');

const _ = require('lodash');

// Cache Authentication for 10 minutes
const AUTHENTICATION_TTL = 10 * 60 * 1000;

// Airblast options
const options = {
	wrapInData: true,
	corsHosts: ['portal.climate.sg', 'p.climate.sg', 'portal.climateconversations.sg'],
	authenticate,
};

/**
 * Authenticate the webhook request
 * It can either come from Raisely (shared key) or from
 * a facilitator doing data entry, in which case we need to authenticate
 * them against raisely
 */
async function authenticate(token) {
	const { RAISELY_WEBHOOK_KEY } = process.env;
	if (token === RAISELY_WEBHOOK_KEY) return true;

	const { tags, roles } = await getTagsAndRoles(token);

	if (roles.includes('ORG_ADMIN')) return true;
	if (_.intersection(['facilitator', 'team-leader'], tags).length) return true;

	return false;
}

/**
 * Get a users roles and tags for use in authentication
 * @param {} req
 */
async function getTagsAndRoles(token) {
	const noMatch = { tags: [], roles: [] };
	if (!token) return noMatch;

	const opt = { cacheTTL: AUTHENTICATION_TTL };
	let authentication;
	let user;

	try {
		[authentication, user] = await Promise.all([
			raiselyRequest({ ...opt, cacheKey: `/authenticate ${token}`, path: '/authenticate', token }),
			raiselyRequest({ ...opt, cacheKey: `/users/me ${token}`, path: '/users/me?private=1', token }),
		]);
	} catch (error) {
		if (error.statusCode && (error.statusCode >= 400) && (error.statusCode <= 499)) {
			const path = _.get(error, 'request.uri.path', '');
			console.log(`Authentication request (${path}) failed (status: ${error.statusCode})`);
			return noMatch;
		}
		throw error;
	}

	return {
		tags: _.get(user, 'tags', []).map(t => t.path),
		roles: _.get(authentication, 'roles', []),
	};
}

/**
  * This controller will receive create, update, delete hooks from raisely
  * to update other services
  */
class RaiselyPeople extends AirblastController {
	validate({ data }) {
		if (!data.type) {
			throw new Error('Event contains no event type');
		}
		if (!data.data) {
			throw new Error('Event contains no data');
		}
		if (data.type === 'guest.created') {
			const keys = Object.keys (data.data);
			const requiredKeys = ['user', 'preSurvey', 'postSurvey', 'conversation', 'rsvp'];
			const missingKeys = _.difference(requiredKeys, keys);
			if (missingKeys.length) {
				throw new Error(`Guest event missing required data: ${missingKeys}`);
			}
			if (!data.data.rsvp.uuid) {
				throw new Error('RSVP uuid is necessary to save data');
			}
		}
	}

	async process({ data }) {
		const validEvents = Object.keys(raiselyEvents);
		if (!validEvents.includes(data.type)) {
			this.log(`Invalid event ${data.type} (ignoring)`);
			return;
		}

		// Defer to the orchestrator to decide which controllers should process
		// the event
		raiselyEvents[data.type].forEach(controller => {
			this.controllers[controller].enqueue(data);
		});
	}
}

RaiselyPeople.options = options;

module.exports = RaiselyPeople;
