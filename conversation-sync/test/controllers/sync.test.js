const { expect } = require('chai');
const { nockAirtables, nockKepla } = require('./nocks');
const guestData = require('./guestData');

const routes = require('../../src/router');

describe('Sync controller', () => {
	describe('post', () => {
		it('saves the update in datastore');
		it('sends a pubsub event');
	});

	describe('syncGuest', () => {
		describe('WHEN new record', () => {
			itHitsAllNocks({ airtables: true, kepla: true });
		});
		describe('WHEN kepla is processed', () => {
			it('syncs to airtables');
			it('does not sync to kepla');
		});
		describe('WHEN airtables is processed', () => {
			it('syncs to kepla');
			it('does not sync to airtables');
		});
		describe('WHEN all synced', () => {
			it('does nothing');
		});
	});
});

function itHitsAllNocks(opts) {
	const nocks = {};
	before(async () => {
		nocks.airtables = nockAirtables();
		nocks.kepla = nockKepla();
		// Run
		return routes.syncGuest(guestData);
	});
	['airtables', 'kepla'].forEach((n) => {
		it(`${opts[n] ? 'syncs' : 'does not sync'} to ${n}`, () => {
			const expectation = !!opts[n];
			const message = expectation ?
				`Some nocks not satisfied: ${nocks[n].pendingMocks()}` :
				'Expected no requests to be made for ${n}';
			expect(nocks[n].isDone(), message).to.eq(expectation);
		});
	});
}
