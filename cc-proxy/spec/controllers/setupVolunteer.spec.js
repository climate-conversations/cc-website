const request = require('request-promise-cache');

const nock = require('nock');
const { expect } = require('chai');

const { setupVolunteer } = require('../../src');

const MockResponse = require('../utils/mockResponse');
const MockRequest = require('../utils/mockRequest');

function nockRaisely() {
	return nock('https://api.raisely.com/v3')
		.log(console.log);
}

const userUuid = 'a_user_uuid';
const newTeamUuid = 'new_team_uuid';
const userProfileUuid = 'user_profile_uuid';

describe('Setup Volunteer', () => {
	describe('WHEN type is facilitator', () => {
		describe('WHEN facil is new', () => {
			before(() => {
				clearNocks();
				nockAuthentication(['DATA_ADMIN'], ['team-leader']);
				nockSetupProfile('INDIVIDUAL');
				nockSetAdminFlag();
				nockTagUser([], ['facilitator']);
				nockSetRole([], ['DATA_LIMITED']);
				nockAssignment();
				const req = setupRequest({
					type: 'facilitator',
					userUuid,
					teamUuid: newTeamUuid,
				});
				return sendRequest(req);
			});
			it('creates a profile', () => {
				expectNockCalled('POST /profiles', {
					body: { data: { userUuid, type: 'INDIVIDUAL', } },
					uri: `/v3/profiles/${newTeamUuid}/members`,
				});
			});
			it('adds role', () => {
				expectNockCalled('POST /users/roles', { body: { data: [{ role: 'DATA_LIMITED' }]} });
			});
			it('adds tag', () => {
				expectNockCalled('POST /tags/facilitator/records', { body: { data: [{ uuid: userUuid }]} });
			});
			itSetsAdminFlag();
		});

		describe('WHEN nothing needs to change', () => {
			before(() => {
				clearNocks();
				nockAuthentication(['DATA_ADMIN'], ['team-leader']);
				nockSetupProfile('INDIVIDUAL', { parentUuid: newTeamUuid });
				nockSetAdminFlag();
				nockAssignment();
				nockTagUser(['facilitator'], [], true);
				nockSetRole(['DATA_LIMITED'], []);
				const req = setupRequest({
					type: 'facilitator',
					userUuid,
					teamUuid: newTeamUuid,
				});
				return sendRequest(req);
			});
			it('does not create or update profile', () => {
				expectNockNotCalled('POST /profiles');
				expectNockNotCalled('PUT /profiles');
			});
			itDoesNotChangeUser();
		});

		describe('WHEN facil is changing team', () => {
			before(() => {
				clearNocks();
				nockAuthentication(['DATA_ADMIN'], ['team-leader']);
				nockSetupProfile('INDIVIDUAL', { uuid: userProfileUuid, parentUuid: 'an_old_team' }, true);
				nockSetAdminFlag();
				nockAssignment();
				nockTagUser(['facilitator'], [], true);
				nockSetRole(['DATA_LIMITED'], []);
				const req = setupRequest({
					type: 'facilitator',
					userUuid,
					teamUuid: newTeamUuid,
				});
				return sendRequest(req);
			});
			it('changes the team', () => {
				expectNockCalled('PUT /profiles', {
					uri: `/v3/profiles/${userProfileUuid}/join`,
					body: { parentUuid: newTeamUuid }
				});
			});
			itDoesNotChangeUser();
		});
	});
});

let requests = {};

function clearNocks() {
	nock.cleanAll();
	requests = {};
	request.cache.clear();
}

function itDoesNotChangeUser() {
	it('does not add roles', () => {
		expectNockNotCalled('POST /users/roles');
	});
	it('does not add tags', () => {
		expectNockNotCalled('POST /tags/facilitator/records');
	});
	itDoesNotSetAdminFlag();
}

function itSetsAdminFlag() {
	it('sets admin flag', () => expectNockCalled('PUT /users', { body: { data: { isAdmin: true } } }));
}

function itDoesNotSetAdminFlag() {
	it('does not set admin flag', () => expectNockNotCalled('PUT /users'));
}

function noteRequest(name, method, path, status, responseBody) {
	const fn = method.toLowerCase();
	return nockRaisely()[fn](path)
		.reply((uri, body) => {
			requests[name] = {
				uri,
				body
			}
			return [status, responseBody];
		});
}

function expectNockNotCalled(name) {
	expect(requests).to.not.have.any.keys(name);
}

function expectNockCalled(name, { uri, body }) {
	expect(requests).to.containSubset({ [name] : {} });
	if (uri) expect(requests[name].uri).to.eq(uri);
	if (body) expect(requests[name].body).to.containSubset(body);
}

function nockSetupProfile(type, existingProfile, shouldMove) {
	const existingProfiles = existingProfile ? [existingProfile] : [];
	noteRequest('GET /profiles', 'GET', `/users/${userUuid}/profiles?type=${type}&campaign=cc-volunteer-portal`, 200, { data: existingProfiles });
	if (!existingProfile) {
		noteRequest('POST /profiles', 'POST', `/profiles/${newTeamUuid}/members`, 200, {});
	} else if (shouldMove) {
		noteRequest('PUT /profiles', 'PUT', `/profiles/${userProfileUuid}/join`, 200, {});
	}
}

function nockSetRole(existingRoles, newRoles = []) {
	noteRequest('GET /users', 'GET', `/users/${userUuid}/roles?private=1`, 200, { data: existingRoles.map(role => ({ role })) });
	if (newRoles && newRoles.length) {
		noteRequest(`POST /users/roles`, 'POST', `/users/${userUuid}/roles`, 200, { data: newRoles.map(role => ({ role })) });
	}
}

function nockTagUser(existingTags, newTags = [], isAdmin = false) {
	noteRequest('GET /tags', 'GET', `/tags?private=1`, 200, {
		data: newTags.map(path => ({
			uuid: `uuid-${path}`,
			path
		})),
	});

	noteRequest('GET /users', 'GET', `/users/${userUuid}?private=1`, 200, {
		data: {
			fullName: 'Mock user',
			tags: existingTags.map(path => ({ path })),
			isAdmin,
		}
	});
	newTags.forEach(tag => {
		noteRequest(`POST /tags/${tag}/records`, 'POST', `/tags/uuid-${tag}/records`, 200, {});
	});
}

function nockSetAdminFlag() {
	noteRequest('PUT /users', 'PUT', `/users/${userUuid}`, 200, {});
}

function nockAuthentication(roles, tags) {
	noteRequest('GET /authenticate', 'GET', '/authenticate', 200, { data: { roles: roles.map(role => ({ role })) } });
	noteRequest('GET /auth/tags', 'GET', '/users/me?private=1', 200, { data: { tags: tags.map(path => ({ path })) } });
}

function nockAssignment() {
	noteRequest('POST /users/assignments', 'POST', '/users/a_user_uuid/assignments');
}

function setupRequest(data) {
	const req = new MockRequest({
		headers: {
			Authorization: 'bearer token',
		},
		body: { data },
		method: 'POST',
	});
	return req;
}

async function sendRequest(req) {
	const res = new MockResponse();
	await setupVolunteer(req, res);
	if (res.statusCode !== 200) {
		throw new Error(res.body.errors[0].message);
	}
}
