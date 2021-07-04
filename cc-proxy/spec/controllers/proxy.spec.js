const { pick } = require('lodash');

const chai = require('chai');
const nock = require('nock');
const request = require('request-promise-cache');

const MockResponse = require('../utils/mockResponse');
const MockRequest = require('../utils/mockRequest');
const { proxy } = require('../../src');

const { statusOk, itReturnsMinimalUser } = require('./shared');

const { expect } = chai;

const apiNock = nock('https://api.raisely.com');

const mockUser = {
	uuid: 'some uuid',
	preferredName: 'Bob',
	fullName: 'Robert Brown',
	email: 'bob@cc.test',
	private: { host: true },
};

describe('proxy', () => {
	const results = {
		user: mockUser,
	};
	let raiselyRequest;

	before(() => {
		// Clear the cache on re-runs
		request.cache.clear();
		nock.cleanAll();
	});

	describe('POST /interactions', () => {
		before(() => {
			results.res = new MockResponse();
			results.req = new MockRequest({
				method: 'POST',
				url: '/interactions?campaign=campaignUuid',
				headers: {
					Origin: 'https://climateconversations.raisely.com',
				},
				body: {
					data: mockUser,
				},
			});
			apiNock
				.post('/v3/interactions?campaign=campaignUuid')
				.reply(200, function userRequest(uri, body) {
					raiselyRequest = {
						body,
						headers: this.req.headers,
						query: uri.split('?')[1],
					};
					return { data: mockUser };
				});

			// Run the controller
			return proxy(results.req, results.res);
		});

		statusOk(results);
		it('sends headers to raisely', () => {
			expect(raiselyRequest.headers).to.containSubset({
				'x-original-user': '(general public)',
				'x-cc-proxy-url': '/interactions?campaign=campaignUuid',
				origin: 'https://climateconversations.raisely.com',
				'user-agent': 'Climate Conversations Proxy',
				authorization: 'Bearer MOCK_APP_TOKEN',
			});
		});
		it('passes through correct headers', () => {
			expect(results.res.headers).to.containSubset({
				'Access-Control-Allow-Credentials': 'true',
				'Access-Control-Allow-Origin': 'https://climateconversations.raisely.com',
			});
		});
		it('forwards the body', () => {
			expect(raiselyRequest.body).to.eql(results.req.body);
		});
		it('forwards the query', () => {
			expect(raiselyRequest.query).to.eql('campaign=campaignUuid');
		});
	});
	describe('POST /event/:event/rsvp', () => {
		before(() => {
			results.res = new MockResponse();
			results.req = new MockRequest({
				method: 'POST',
				url: '/events/event-uuid/rsvps?campaign=campaignUuid',
				headers: {
					Origin: 'https://climateconversations.sg',
				},
				body: {
					data: { userUuid: 1 },
				},
			});
			raiselyRequest = null;
			apiNock
				.post('/v3/events/event-uuid/rsvps?campaign=campaignUuid')
				.reply(200, function rsvpRequest(uri, body) {
					raiselyRequest = {
						body,
						headers: this.req.headers,
						query: uri.split('?')[1],
					};
					return { data: body };
				});

			// Run the controller
			return proxy(results.req, results.res);
		});

		statusOk(results);
		it('forwards the query', () => {
			expect(raiselyRequest).to.not.be.null;
		});
		it('escalates auth token', () => {
			expect(raiselyRequest).to.not.be.null;
			expect(raiselyRequest.headers.authorization).to.eq('Bearer MOCK_APP_TOKEN');
		});
	});

	describe('proxies failure', () => {
		const errorBody = {
			errors: [{
				message: 'That was not good',
			}],
		};
		before(() => {
			raiselyRequest = null;

			results.res = new MockResponse();
			results.req = new MockRequest({
				method: 'POST',
				url: '/interactions',
				headers: {
					Origin: 'https://climateconversations.raisely.com',
				},
				body: {
					data: {
						category: 'bad category',
					},
				},
			});
			nock('https://api.raisely.com')
				.post('/v3/interactions')
				.reply(400, function userRequest(uri, body) {
					raiselyRequest = {
						body,
						headers: this.req.headers,
					};
					return errorBody;
				});

			// Run the controller
			return proxy(results.req, results.res);
		});

		it('status 400', () => {
			expect(results.res.statusCode).to.eq(400);
		});
		it('returns raisely body', () => {
			expect(results.res.body).to.containSubset(errorBody);
		});
	});

	describe('GET /campaigns/:campaign?private=1', () => {
		const originalAuthKey = 'Bearer key-with-tags';
		let tagNock;
		let authNock;

		before(() => {
			raiselyRequest = null;
			results.res = new MockResponse();
			results.req = new MockRequest({
				method: 'get',
				url: '/campaigns/uuid?private=1',
				headers: {
					Origin: 'https://climateconversations.raisely.com',
					Authorization: originalAuthKey,
				},
				body: {
					data: {
						name: 'A very dodgy campaign',
					},
				},
			});
			authNock = apiNock
				.get('/v3/authenticate')
				.reply(200, {
					data: { roles: [] },
				});
			tagNock = apiNock
				.get('/v3/users/me?private=1')
				.reply(200, {
					data: { tags: [{ path: 'facilitator' }] },
				});
			apiNock
				.get('/v3/campaigns/uuid?private=1')
				.reply(200, function userRequest(uri, body) {
					raiselyRequest = {
						body,
						headers: this.req.headers,
					};
					return body;
				});

			// Run the controller
			return proxy(results.req, results.res);
		});

		it('loads tags', () => {
			expect(tagNock.isDone()).to.be.true;
		});
		it('loads roles', () => {
			expect(authNock.isDone()).to.be.true;
		});
		it('escalates auth token', () => {
			expect(raiselyRequest).to.not.be.null;
			expect(raiselyRequest.headers.authorization).to.eq('Bearer MOCK_APP_TOKEN');
		});
	});

	describe('bad auth header', () => {
		const originalAuthKey = 'Bearer fake-key';

		before(() => {
			raiselyRequest = null;
			const unauthorized = {
				status: 403,
				errors: [{ message: 'You are not authorized to do that', status:403, code: 'unauthorized',
				}]
			};

			results.res = new MockResponse();
			results.req = new MockRequest({
				method: 'POST',
				url: '/campaigns',
				headers: {
					Origin: 'https://climateconversations.raisely.com',
					Authorization: originalAuthKey,
				},
				body: {
					data: {
						name: 'A very dodgy campaign',
					},
				},
			});
			nock('https://api.raisely.com')
				.get('/v3/authenticate')
				.reply(403, unauthorized)
				.get('/v3/users/me?private=1')
				.reply(403, unauthorized);

			// Run the controller
			return proxy(results.req, results.res);
		});

		it('returns an error', () => {
			expect(results.res.statusCode).to.eq(403);
		});
		it('does not send request', () => {
			expect(raiselyRequest).to.be.null;
		});
	});

	describe('disallowed', () => {
		const originalAuthKey = 'Bearer legit-key';

		before(() => {
			raiselyRequest = null;
			results.res = new MockResponse();
			results.req = new MockRequest({
				method: 'POST',
				url: '/campaigns',
				headers: {
					Origin: 'https://climateconversations.raisely.com',
					Authorization: originalAuthKey,
				},
				body: {
					data: {
						name: 'A very dodgy campaign',
					},
				},
			});
			nock('https://api.raisely.com')
				.get('/v3/authenticate')
				.reply(200, {
					data: { roles: [] },
				})
				.get('/v3/users/me?private=1')
				.reply(200, {
					data: { tags: [] },
				})
				.post('/v3/campaigns')
				.reply(200, function userRequest(uri, body) {
					raiselyRequest = {
						body,
						headers: this.req.headers,
					};
					return body;
				});

			// Run the controller
			return proxy(results.req, results.res);
		});

		it('passes through authorization header', () => {
			expect(raiselyRequest).to.not.be.null;
			expect(raiselyRequest.headers.authorization).to.eq(originalAuthKey);
		});
	});

	describe('OPTIONS', () => {
		before(() => {
			results.res = new MockResponse();
			results.req = new MockRequest({
				method: 'OPTIONS',
				url: '/interactions',
				headers: {
					Origin: 'https://climateconversations.raisely.com',
				},
			});

			// Run the controller
			return proxy(results.req, results.res);
		});
		it('status 204', () => {
			expect(results.res.statusCode).to.eq(204);
		})
	})
});
