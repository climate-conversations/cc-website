const _ = require('lodash');
const { authorize } = require('./proxy/permissions');
const raiselyRequest = require('./raiselyRequest');

/**
 * Setup a facilitator or team leader
 * @param {object} req
 * @param {object} req.body.data
 * @param {object} req.body.data.userUuid UUID of the user
 * @param {object} req.body.data.type 'facilitator' or 'team-leader'
 * @param {object} req.body.data.parentUuid UUID of the parent profile (team to join)
 * @param {object} req.body.data.name Name of the profile to create
 */
async function setupVolunteer(req) {
	const {
		userUuid,
		type,
		teamUuid,
		teamName,
	} = req.body.data;

	const isAuthorized = await authorize(req, `/setupVolunteer/${type}`);

	if (!isAuthorized) {
		throw new Error('You are not authorized to do that');
	}

	const promises =[];

	if (type === 'facilitator') {
		promises.push(setupTagsAndRoles({ userUuid, tags: ['facilitator'], roles: ['DATA_LIMITED'], req }));
		promises.push(setupProfile({
			type: 'INDIVIDUAL',
			userUuid,
			parentUuid: teamUuid,
			req,
		}));
	} else if (type === 'team-leader') {
		promises.push(setupTagsAndRoles({ tags: ['team-leader'], roles: ['DATA_ADMIN', 'PROFILE_EDITOR'], req }));
		promises.push(setupProfile({
			type: 'GROUP',
			userUuid,
			name: teamName,
			req,
		}));
	}

	await Promise.all(promises);

	return {
		status: 'OK',
	}
}

/**
 * Upsert a profile for a user
 * Creates if necesary and joins team if it's not on that team
 * @param {string} opts.type
 * @param {string} opts.name
 * @param {string} opts.userUuid
 * @param {string} opts.parentUuid
 * @param {object} opts.req
 */
async function setupProfile({ type, name, userUuid, parentUuid, req }) {
	let promises = [
		raiselyRequest({
			path: `/users/${userUuid}/profiles?type=${type}&campaign=cc-volunteer-portal`,
			escalate: false
		}, req),
	];

	if (!parentUuid) {
		promises.push(raiselyRequest({
			path: `/campaigns/cc-volunteer-portal`,
			escalate: false
		}, req));
	}

	let profileName = name;

	if (!name) {
		const userData = await raiselyRequest({
			path: `/users/${userUuid}?private=1`,
			escalate: false,
			cacheKey: `/users/${userUuid}?private=1`,
			cacheTTL: 10000,
		}, req);
		profileName = userData.data.fullName || userData.data.preferredName;
		if (!profileName) {
			throw new Error(`Cannot create profile for unnamed user ${userUuid}`);
		}
	}

	const [profiles, campaign] = await Promise.all(promises);
	const [profile] = profiles.data;


	if (campaign) parentUuid = campaign.profile.uuid;

	// Create individual profile (if one doesn't exist)
	if (!profiles.data.length) {
		await raiselyRequest({
			method: 'POST',
			path: `/profiles/${parentUuid}/members`,
			body: {
				data: {
					userUuid,
					type,
					goal: 25000,
					currency: 'SGD',
					name: profileName,
				},
			},
			escalate: false
		}, req);
	// Otherwise move the profile if necessary
	} else if (profile.parentUuid !== parentUuid) {
		await raiselyRequest({
			method: 'PUT',
			path: `/profiles/${profile.uuid}/join`,
			body: {
				parentUuid,
			},
			escalate: false
		}, req);
	}

	await Promise.all(promises);
}

/**
 *
 * @param {string[]} opts.tags
 * @param {string[]} opts.roles
 * @param {string} opts.userUuid
 * @param {object} opts.req
 */
async function setupTagsAndRoles({ tags, roles, userUuid, req }) {
	const tagDetails = await raiselyRequest({
		path: `/tags?private=1`,
		escalate: false,
		cacheKey: `/tags?private=1`,
		cacheTTL: 10 * 60 * 1000,
	}, req);

	// Get existing tags and permissions
	const [userData, rolesData] = await Promise.all([
		raiselyRequest({
			path: `/users/${userUuid}?private=1`,
			escalate: false,
			cacheKey: `/users/${userUuid}?private=1`,
			cacheTTL: 10000,
		}, req),
		raiselyRequest({ path: `/users/${userUuid}/roles?private=1`, escalate: true }, req),
	]);

	const existingTags = _.get(userData, 'data.tags', []).map(t => t.path);
	const existingRoles = _.get(rolesData, 'data', []).map(r => r.role);

	const promises = [];

	const missingTags = _.difference(tags, existingTags);
	const missingRoles = _.difference(roles, existingRoles);

	// Tag the person
	missingTags.forEach((tag) => {
		const tagUuid = tagDetails.data.find(t => t.path === tag).uuid;
		promises.push(raiselyRequest({
			path: `/tags/${tagUuid}/records`,
			method: 'POST',
			body: {
				data: [{ uuid: userUuid }],
			},
			escalate: false
		}, req));
	});
	// Add roles
	if (missingRoles.length) {
		promises.push(raiselyRequest({
			path: `/users/${userUuid}/roles`,
			method: 'POST',
			body: {
				data: missingRoles.map(role => ({ role })),
			},
			escalate: false
		}, req));
	}
	if (!userData.data.isAdmin) {
		promises.push(raiselyRequest({
			path: `/users/${userUuid}`,
			method: 'PUT',
			body: {
				data: { isAdmin: true },
			},
			escalate: true
		}, req));
	}

	await Promise.all(promises);
}

module.exports = {
	setupVolunteer,
};
