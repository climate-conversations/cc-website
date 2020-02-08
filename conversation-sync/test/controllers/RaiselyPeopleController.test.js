const runController = require('airblast/test/runController');
const requestPromiseCache = require('request-promise-cache');

const PeopleController = require('../../src/controllers/People');

const { expect } = require('chai');
const { nockRaisely } = require('../testHelper');

const USER_TOKEN = 'a_user_token';

describe('People Controller', () => {
	describe('Authentication', () => {
		let res;
		describe('no token', () => {
			before(async () => {
				res = await runController(new PeopleController(), prepRequest());
			});

			it('Returns 401', () => expect(res.statusCode).to.eq(401));
		});
		describe('bad token', () => {
			before(async () => {
				nockRaiselyAuth({ exists: false });
				res = await runController(new PeopleController(), prepRequest('bad_token'));
			});
			it('Returns 401', () => expect(res.statusCode).to.eq(401));
		});
		describe('raisely token', () => {
			before(async () => {
				res = await runController(new PeopleController(), prepRequest(process.env.RAISELY_WEBHOOK_KEY || 'test_raisely_token'));
			});
			it('Returns 200', () => expect(res.statusCode).to.eq(200));
		});
		describe('insufficient user token', () => {
			before(async () => {
				requestPromiseCache.cache.clear();
				nockRaiselyAuth({ exists: true, sufficient: false });
				res = await runController(new PeopleController(), prepRequest(USER_TOKEN));
			});
			it('Returns 401', () => expect(res.statusCode).to.eq(401));
		});
		describe('sufficient user token', () => {
			before(async () => {
				requestPromiseCache.cache.clear();
				nockRaiselyAuth({ exists: true, sufficient: true });
				res = await runController(new PeopleController(), prepRequest(USER_TOKEN));
			});
			it('Returns 200', () => expect(res.statusCode).to.eq(200));
		});

	});
});

function prepRequest(token) {
	const options = {
		throwOnError: false,
	}
	if (token) {
		options.headers = {
			authorization: `bearer ${token}`,
		};
	}
	return options;
}

function nockRaiselyAuth({ exists, sufficient }) {
	const validRoles = sufficient ? ['ORG_ADMIN'] : ['FINANCE_ADMIN'];
	const validTags = sufficient ? ['facilitator', 'team-leader'].map(t => ({ path: t })) : [];

	const authResponse = exists ?
		[200, { data: { roles: validRoles }}] :
		[401, { errors: {} }];

	const tagsResponse = exists ?
		[200, { data: { tags: validTags }}] :
		[401, { errors: {} }];

	nockRaisely()
		.get('/authenticate')
		.reply(...authResponse)
		.get('/users/me?private=1')
		.reply(...tagsResponse);
}
