/* eslint-disable no-param-reassign */
const { pick } = require('lodash');

const chai = require('chai');
const nock = require('nock');

const MockResponse = require('../utils/mockResponse');
const MockRequest = require('../utils/mockRequest');
const { upsertUser } = require('../../src');

const { statusOk, itReturnsMinimalUser } = require('./shared');

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

describe('upsertUser', () => {
	const results = {
		user: completeUser,
	};
	let raiselyRequest;

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
});


function setup(results) {
	results.res = new MockResponse();
	results.req = new MockRequest({
		method: 'POST',
		url: '/',
		headers: {
			Origin: 'https://climateconversations.raisely.com',
		},
		body: {
			data: createUser,
		},
	});
}
