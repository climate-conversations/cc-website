const { expect } = require('chai');
const MailchimpNock = require('./nock');
const _ = require('lodash');

const MailchimpService = require('../../src/services/mailchimp');

const LIST_ID = 'TEST_LIST_ID';
const EMAIL = 'test@email.test';

const person = {
	uuid: '2e7eff08-4564-4d3c-a091-a4d95425f545',
	email: EMAIL,
	firstName: 'Albert',
	lastName: 'Einstein',
	fullName: 'Albert Q. Einstein',
	preferredName: 'Al',
	private: { host: true, facilitate: true },
	tags: [],
};

// Tags to test
// Facilitator - no change
// Government - create & add
// Scientist - add
// Partner - remove
// Letter-writing - absent, but don't remove
const raiselyTags = ['facilitator', 'government', 'scientist'];
const mailchimpTags = ['facilitator', 'partner', 'scientist', 'letter-writing'];
const tagsOnList = ['facilitator', 'partner', 'letter-writing'];

const formatRaiselyTags = tags => tags.map(tag => ({
	path: _.camelCase(tag),
	name: _.startCase(tag),
}));

const personWithTags = {
	...person,
	tags: formatRaiselyTags(raiselyTags),
};

describe('Mailchimp service', () => {
	let nocks;
	let service;
	before(() => {
		service = new MailchimpService('test-us16');
	});

	describe('isOnList', () => {
		after(() => {
			nocks.reset()
			service.flushCache();
		});
		it('on list returns true', async () => {
			nocks = new MailchimpNock(LIST_ID, EMAIL);
			nocks.getUser(200, { status: 'subscribed' });
			const result = await service.isOnList(LIST_ID, person);
			expect(result).to.eq(true);
		});
		it("off list returns false", async () => {
			nocks = new MailchimpNock(LIST_ID, EMAIL);
			nocks.reset();
			nocks.getUser(404, { detail: "person not found" });
			const result = await service.isOnList(LIST_ID, person);
			expect(result).to.eq(false);
		});
	});

	describe('syncPersonToList', () => {
		describe('WHEN new record', () => {
			before(async () => {
				service.flushCache();
				nocks = new MailchimpNock(LIST_ID, EMAIL);
				nocks.getUser(404, { detail: 'person not found' });
				nocks.createUser(200, { tags: [] });
				nocks.getTags([]);
				nocks.createTags();
				nocks.addTags();
				nocks.getInterests();
				nocks.getInterestCategories();
				await service.syncPersonToList(personWithTags, LIST_ID, false);
			});
			after(() => nocks.reset());
			it('adds person to list', () => {
				expect(nocks.calls.user).to.deep.eq({
					get: 1,
					create: 1,
				});
			});
			it('creates tags', () => {
				expect(nocks.calls.tags).to.deep.eq({
					get: 1,
					create: raiselyTags,
					add: raiselyTags,
				});
			});
		});

		describe('WHEN updated', () => {
			before(async () => {
				service.flushCache();
				nocks = new MailchimpNock(LIST_ID, EMAIL);
				nocks.getUser(200, { tags: nocks.formatTags(tagsOnList), status: 'subscribed' });
				nocks.updateUser(200, {});
				nocks.getTags(mailchimpTags);
				nocks.createTags();
				nocks.addTags();
				nocks.removeTags();
				nocks.getInterests();
				nocks.getInterestCategories();
				await service.syncPersonToList(personWithTags, LIST_ID, true);
			});
			after(() => nocks.reset());

			it('updates the person', () => {
				expect(nocks.calls.user).to.deep.eq({
					get: 1,
					update: 1,
				});
			});
			it('creates tags', () => {
				expect(nocks.calls.tags).to.deep.eq({
					get: 1,
					create: ["government"],
					add: ["scientist", "government"],
					remove: ["partner"],
				});
			});
		});

		describe('WHEN unsubscribed', () => {
			before(async () => {
				service.flushCache();
				nocks = new MailchimpNock(LIST_ID, EMAIL);
				nocks.reset();
				nocks.getUser(200, { tags: [], status: '' });
				nocks.updateUser(200, {});
				nocks.getTags(mailchimpTags);
				nocks.getInterests();
				nocks.getInterestCategories();
				await service.syncPersonToList(person, LIST_ID, false);
			});
			after(() => nocks.reset());

			it('subscribes', () => {
				expect(nocks.calls.user).to.deep.eq({
					get: 1,
					update: 0,
				});
			});
			it('does not create tags', () => {
				expect(nocks.calls.tags).to.deep.eq({
					get: 0,
				});
			});
		});
		// describe('WHEN cannot create', () => {
		// 	before(async () => {
		// 		nocks = new MailchimpNock(LIST_ID, EMAIL);
		// 		nocks.getUser(400, { detail: 'person cannot be added' });
		// 		await service.syncPersonToList(person, LIST_ID, false);
		// 	});
		// 	after(() => nocks.reset());

		// 	it('does nothing', () => {
		// 		expect(nocks.calls.user).to.deep.eq({
		// 			get: 1,
		// 		});
		// 	});
		// });
	});
});
