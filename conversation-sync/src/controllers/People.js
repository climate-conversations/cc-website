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
	if (['facilitator', 'team-leader'].includes(tags)) return true;

	return false;
}

/**
 * Get a users roles and tags for use in authentication
 * @param {} req
 */
async function getTagsAndRoles(token) {
	if (!token) return { tags: [], roles: [] };

	const opt = { cacheTTL: AUTHENTICATION_TTL };
	const [authentication, user] = await Promise.all([
		raiselyRequest({ ...opt, cacheKey: `/authenticate ${token}`, path: '/authenticate', token }),
		raiselyRequest({ ...opt, cacheKey: `/users/me ${token}`, path: '/users/me?private=1', token }),
	]);

	return {
		tags: _.get(user, 'data.tags', []).map(t => t.path),
		roles: _.get(authentication, 'data.roles', []),
	};
}

/**
  * This controller will receive create, update, delete hooks from raisely
  * to update other services
  */
class RaiselyPeople extends AirblastController {
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
