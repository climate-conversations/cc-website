const { pick } = require('lodash');

const chai = require('chai');
const nock = require('nock');

const MockResponse = require('../utils/mockResponse');
const MockRequest = require('../utils/mockRequest');
const { proxy } = require('../../src');

const { statusOk, itReturnsMinimalUser } = require('./shared');

const { expect } = chai;

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
			nock('https://api.raisely.com')
				.log(console.log)
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

	describe('disallowed', () => {
		before(() => {
			raiselyRequest = null;

			results.res = new MockResponse();
			results.req = new MockRequest({
				method: 'POST',
				url: '/campaigns',
				headers: {
					Origin: 'https://climateconversations.raisely.com',
				},
				body: {
					data: {
						name: 'A very dodgy campaign',
					},
				},
			});
			nock('https://api.raisely.com')
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

		it('status 403', () => {
			expect(results.res.statusCode).to.eq(403);
		});
		it('does not send the request to raisely', () => {
			expect(raiselyRequest).to.be.null;
		});
		it('returns forbidden error', () => {
			expect(results.res.body).to.containSubset({
				errors: [{
					status: 403,
					message: 'You are not authorized to make that request',
					code: 'unauthorized'
				}],
			});
		});
	});
});
