const { expect } = require('chai');
const MailchimpNock = require('./nock');

process.env.MAILCHIMP_KEY = 'test-us16';
const service = require('../../src/services/mailchimp');

const LIST_ID = 'TEST_LIST_ID';
const EMAIL = 'test@email.test';

const person = {
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

const personWithTags = {
	...person,
	tags: raiselyTags,
};

describe('Mailchimp service', () => {
	let nocks;
	describe('syncPersonToList', () => {
		describe('WHEN new record', () => {
			before(async () => {
				nocks = new MailchimpNock(LIST_ID, EMAIL);
				nocks.getUser(404, { detail: 'person not found' });
				nocks.createUser(200, { tags: [] });
				nocks.getTags([]);
				nocks.createTags();
				nocks.addTags();
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
				nocks = new MailchimpNock(LIST_ID, EMAIL);
				nocks.getUser(200, { tags: tagsOnList, status: 'subscribed' });
				nocks.updateUser(200, {});
				nocks.getTags(mailchimpTags);
				nocks.createTags();
				nocks.addTags();
				nocks.removeTags();
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
					create: ['government'],
					add: ['government', 'scientist'],
					remove: ['partner']
				});
			});
		});

		describe('WHEN unsubscribed', () => {
			before(async () => {
				nocks = new MailchimpNock(LIST_ID, EMAIL);
				nocks.getUser(200, { tags: [], status: '' });
				nocks.updateUser(200, {});
				await service.syncPersonToList(person, LIST_ID, false);
			});
			after(() => nocks.reset());

			it('subscribes', () => {
				expect(nocks.calls.user).to.deep.eq({
					get: 1,
					update: 2,
				});
			});
			it('does not create tags', () => {
				expect(nocks.calls.tags).to.deep.eq({
					get: 1,
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
