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

	describe('POST /users', () => {
		before(() => {
			results.res = new MockResponse();
			results.req = new MockRequest({
				method: 'POST',
				originalUrl: '/proxy/users',
				headers: {
					Origin: 'https://climateconversations.raisely.com',
				},
				body: {
					data: mockUser,
				},
			});
			nock('https://api.raisely.com')
				.post('/v3/users')
				.reply(200, function userRequest(uri, body) {
					raiselyRequest = {
						body,
						headers: this.req.headers,
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
				'x-cc-proxy-url': '/proxy/users',
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
		itReturnsMinimalUser(results);
	});
});
