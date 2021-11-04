const chai = require('chai');
const nock = require('nock');
const request = require('request-promise-cache');
const _ = require('lodash');

require('../spec.env.js');

const MockResponse = require('../utils/mockResponse');
const MockRequest = require('../utils/mockRequest');
const { assignRecord } = require('../../src');

const { statusOk, nockRaisely } = require('./shared');

const { expect } = chai;

const assignBody = {
	userUuid: 'user-uuid',
	recordType: 'user',
	recordUuid: 'target-uuid',
};

let requests = {};

describe('assignRecord', () => {
	let results = {};
	before(() => {
		results.req = new MockRequest({
			method: 'POST',
			url: '/assignRecord',
			headers: {
				Origin: 'https://climateconversations.raisely.com',
				Authorization: 'Bearer key',
			},
			body: { data: assignBody },
		});
	});

	describe('for DATA_ADMIN', () => {
		before(() => {
			results.res = new MockResponse();
			clearNocks();
			nockAuth(true);
			nockAssignment();
			return assignRecord(results.req, results.res);
		});

		statusOk(results);
		itAssignsUser();
	});
	describe('for USER', () => {
		describe('WHEN assigned record', () => {
			before(() => {
				results.res = new MockResponse();
				clearNocks();
				nockAuth();
				nockCheckAssignment();
				nockAssignment();
				return assignRecord(results.req, results.res);
			});
			statusOk(results);
			itAssignsUser();
		});
		describe('WHEN NOT assigned record', () => {
			before(() => {
				results.res = new MockResponse();
				clearNocks();
				nockAuth();
				nockAssignment();
				return assignRecord(results.req, results.res);
			});
			statusOk(results);
			itAssignsUser();
		});
	});
});

function clearNocks() {
	nock.cleanAll();
	requests = {};
	request.cache.clear();
}

function nockAuth(isTeamLeader) {
	const authNock = nockRaisely()
		.get('/authenticate')
		.reply(200, {
			data: { roles: isTeamLeader ? ['DATA_ADMIN'] : [] },
		});
	const tagNock = nockRaisely()
		.get('/users/me?private=1')
		.reply(200, {
			data: {
				uuid: 'caller-uuid',
				tags: [{ path: isTeamLeader ? 'team-leader' : 'facilitator' }],
				organisationUuid: process.env.ORGANISATION_UUID,
			},
		});
}

function noteRequest(name, method, path, status = 200, responseBody) {
	const fn = method.toLowerCase();
	return nockRaisely()
		[fn](path)
		.reply((uri, body) => {
			requests[name] = {
				uri,
				body,
			};
			return [status, responseBody];
		});
}

function nockAssignment() {
	noteRequest(
		'POST /users/assignments',
		'POST',
		'/users/user-uuid/assignments'
	);
}

function nockCheckAssignment(shouldFind) {
	noteRequest(
		'GET /users/assignments',
		'GET',
		'/users/caller-uuid/assignments/users/target-uuid',
		shouldFind ? 200 : 404
	);
}

function itAssignsUser(shouldCall = true) {
	it(`it ${shouldCall ? 'assigns' : 'does not assign'} the user`, () => {
		const key = 'POST /users/assignments';
		expect(!!requests[key], 'Assignment call was not made').to.eq(
			shouldCall
		);
		if (shouldCall) {
			expect(requests[key].body).to.deep.eq({
				data: [_.pick(assignBody, ['recordType', 'recordUuid'])],
			});
		}
	});
}

function itCheckedAssignment() {
	it('checks assignment', () => {
		expect(
			!!requests['GET /users/assignments'],
			'Assignment was not checked'
		).to.be.true;
	});
}
