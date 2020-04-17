/* eslint-disable no-param-reassign */
const { pick } = require('lodash');
const request = require('request-promise-cache');

const chai = require('chai');
const nock = require('nock');

const MockResponse = require('../utils/mockResponse');
const MockRequest = require('../utils/mockRequest');
const { upsertUser } = require('../../src');

const { statusOk } = require('./shared');

const { expect } = chai;

const createUser = {
	preferredName: 'Bob',
	fullName: 'Robert Brown',
	email: 'bob@cc.test',
	private: { host: true, volunteer: false },
};

const completeUser = {
	...createUser,
	uuid: 'some_uuid',
};

const filteredCreateUser = {
	...createUser,
	private: { host: true },
};

function itReturnsMinimalUser(results) {
	it('returns minimal user', () => {
		expect(results.res.body).to.eql({
			data: pick(results.user, ['preferredName', 'fullName', 'email', 'uuid']),
		});
	});
}

describe('upsertUser', () => {
	const results = {
		user: completeUser,
	};
	let raiselyRequest;

	before(() => {
		nock.cleanAll();
	});

	describe('new user', () => {
		before(() => {
			setup(results);

			nock('https://api.raisely.com')
				.post('/v3/users')
				.reply(200, function userRequest(uri, body) {
					raiselyRequest = {
						body,
						headers: this.req.headers,
					};
					return {
						data: completeUser,
					};
				})
				.get('/v3/users?email=bob%40cc.test&private=1')
				.reply(200, { data: [] });

			return upsertUser(results.req, results.res);
		});

		statusOk(results);
		itReturnsMinimalUser(results);
		it('posts user without falsey action', () => {
			expect(raiselyRequest.body).to.eql({ data: filteredCreateUser });
		});
		it('sends auth token', () => {
			expect(raiselyRequest).to.not.be.null;
			expect(raiselyRequest.headers.authorization).to.eq('Bearer MOCK_APP_TOKEN');
		});
	});

	describe('malformed body', () => {
		before(() => {
			prepareRequest(results, { data: { data: { email: 'fake@cc.test' } } });
			return upsertUser(results.req, results.res);
		});
		it('should return 400', () => {
			expect(results.res.statusCode).to.eq(400);
		});
	});

	describe('existing user', () => {
		before(() => {
			setup(results);
			nock('https://api.raisely.com')
				.patch('/v3/users/some_uuid')
				.reply(200, function userRequest(uri, body) {
					raiselyRequest = {
						body,
						headers: this.req.headers,
					};
					return {
						data: completeUser,
					};
				})
				.get('/v3/users?email=bob%40cc.test&private=1')
				.reply(200, { data: [completeUser] });

			return upsertUser(results.req, results.res);
		});

		it('passes merge param', () => {
			expect(raiselyRequest.body).to.eql({
				data: { private: { host: true } },
				partial: 1,
			});
		});
		statusOk(results);
		itReturnsMinimalUser(results);
	});

	describe('assignment', () => {
		let assignmentRequest;
		describe('new user', () => {
			before(() => {
				results.user = { ...completeUser, uuid: 'some_other_uuid' };
				setup(results, {
					assignSelf: 1,
					data: { ...createUser },
				}, {
					Authorization: 'Bearer 1234',
				});
				nock('https://api.raisely.com')
					.post('/v3/users')
					.reply(200, function userRequest(uri, body) {
						raiselyRequest = {
							body,
							headers: this.req.headers,
						};
						return {
							data: results.user,
						};
					})
					.get('/v3/users?email=bob%40cc.test&private=1')
					.reply(200, { data: [] })
					.post('/v3/users/facil_uuid/assignments')
					.reply(200, function assignmentReq(uri, body) {
						assignmentRequest = {
							body,
							headers: this.req.headers,
						};
						return body;
					});
				nockAuthentication();

				return upsertUser(results.req, results.res);
			});
			statusOk(results);
			itReturnsMinimalUser(results);
			it('posts user without falsey action', () => {
				expect(raiselyRequest.body).to.eql({ data: filteredCreateUser });
			});
			it('assigns the user', () => {
				expect(assignmentRequest).to.not.be.null;
				expect(assignmentRequest.body).to.deep.eq({ data: [{ recordUuid: 'some_other_uuid', recordType: 'user' }] });
			});
		});
		describe('existing user', () => {
			before(() => {
				request.cache.clear();
				assignmentRequest = null;
				setup(results, {
					assignSelf: 1,
					data: { ...createUser, uuid: 'some_other_uuid' },
				}, {
					Authorization: 'Bearer 1234',
				});
				nock('https://api.raisely.com')
					.patch('/v3/users/some_other_uuid')
					.reply(200, function userRequest(uri, body) {
						raiselyRequest = {
							body,
							headers: this.req.headers,
						};
						return {
							data: results.user,
						};
					})
					.get('/v3/users?email=bob%40cc.test&private=1')
					.reply(200, { data: [{ ...completeUser, uuid: 'some_other_uuid' }] })
					.post('/v3/users/facil_uuid/assignments')
					.reply(200, function assignmentReq(uri, body) {
						assignmentRequest = {
							body,
							headers: this.req.headers,
						};
						return body;
					});
				nockAuthentication();

				return upsertUser(results.req, results.res);
			});
			statusOk(results);
			itReturnsMinimalUser(results);
			it('assigns the user', () => {
				expect(assignmentRequest).to.not.be.null;
				expect(assignmentRequest.body).to.deep.eq({ data: [{ recordUuid: 'some_other_uuid', recordType: 'user' }] });
			});
		});
		describe('unauthorized', () => {
			before(() => {
				request.cache.clear();
				assignmentRequest = null;
				setup(results, {
					assignSelf: 1,
					data: { ...createUser, uuid: 'some_other_uuid' },
				});
				nock('https://api.raisely.com')
					.patch('/v3/users/some_other_uuid')
					.reply(200, function userRequest(uri, body) {
						raiselyRequest = {
							body,
							headers: this.req.headers,
						};
						return {
							data: completeUser,
						};
					})
					.get('/v3/users?email=bob%40cc.test&private=1')
					.reply(200, { data: [{ ...completeUser, uuid: 'some_other_uuid' }] });
				nockAuthentication();

				return upsertUser(results.req, results.res);
			});
			it('fails', () => {
				expect(results.res.statusCode).to.eq(403);
			});
		});
	});
});

function prepareRequest(results, body, headers = {}) {
	results.res = new MockResponse();
	results.req = new MockRequest({
		body,
		method: 'POST',
		url: '/',
		headers: {
			Origin: 'https://climateconversations.raisely.com',
			...headers,
		},
	});
}

function setup(results, body, headers) {
	let theBody = body || {
		data: { ...createUser },
	};
	return prepareRequest(results, theBody, headers);
}

function nockAuthentication() {
	nock('https://api.raisely.com')
		.get('/v3/authenticate')
		.reply(200, {
			data: { roles: [] },
		});
	nock('https://api.raisely.com')
		.get('/v3/users/me?private=1')
		.reply(200, {
			data: {
				uuid: 'facil_uuid',
				tags: [{ path: 'facilitator' }],
			},
		});
}
