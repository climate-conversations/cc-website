require('dotenv').config();
const sinon = require('sinon');
const chai = require('chai');
const chaiSubset = require('chai-subset');

const MailchimpController = require('../../src/controllers/Mailchimp');
const MailchimpService = require('../../src/services/mailchimp');

chai.use(chaiSubset);
const { expect } = chai;

let stub;

const basePerson = {
	uuid: '<mock uuid>',
	email: 'noone@test.test',
}

const raiselyTags = (tags) => tags.map(path => ({ path }));

const lists = {
	standard: '6741425dab',
	partner: '56d48ee1bb',
	vip: '5dafb75875',
};

describe('Mailchimp Controller', () => {
	let controller;
	let data;
	let sandbox;
	before(() => {
		controller = new MailchimpController({
			log: console.log,
		});
	});
	describe('Person is unsubscribed', () => {
		before(() => process({
			...basePerson,
			unsubscribedAt: new Date().toISOString(),
		}));
		after(() => sandbox.restore() );
		itDoesNotSubscribeThem();
	});
	describe('Person has dummy email', () => {
		before(() => process({
			...basePerson,
			email: 'george@dummy.invalid',
		}));
		after(() => sandbox.restore() );
		itDoesNotSubscribeThem();
	})
	describe('Person tagged government and facilitator', () => {
		before(() => process({
			...basePerson,
			tags: raiselyTags(['facilitator', 'government']),
		}));
		after(() => sandbox.restore() );
		itShouldAddToList('standard', true);
		itShouldAddToList('partner', false);
	});
	describe('Person with newsletter property', () => {
		before(() => process({
			...basePerson,
			private: { newsletter: true }
		}));
		after(() => sandbox.restore() );

		itShouldAddToList('standard', false);
	});
	describe('Person not on any list', () => {
		before(() => process(basePerson));
		after(() => sandbox.restore() );
		itDoesNotSubscribeThem();
	});

	async function process(person) {
		sandbox = sinon.createSandbox();
		stub = sandbox.stub(MailchimpService.prototype, 'syncPersonToList');

		data = person;
		const result = await controller.process({
			data: { type: 'user.updated', data },
		});
		return result;
	}

	function itShouldAddToList(listId, vip) {
		it(`should add to list ${listId}`, () => {
			let calls = [];
			stub.getCalls().
				forEach(call => calls.push(call.args));

			expect(calls).to.containSubset([[data, lists[listId], vip]]);
		});
	}
});

function itDoesNotSubscribeThem() {
	it('does not subscribe person', () => {
		sinon.assert.notCalled(stub);
	});
}

