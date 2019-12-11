/* eslint-disable class-methods-use-this */
const { AirblastController } = require('airblast');
const _ = require('lodash');

const MailchimpService = require('../services/mailchimp');

const options = {
	wrapInData: true,
};

const lists = {
	standard: {
		listId: '6741425dab',
		tags: ['facilitator', 'team-leader'],
		fields: ['private.host', 'private.volunteer', 'private.newsletter'],

	},
	partner: {
		listId: '56d48ee1bb',
		tags: ['partner', 'government'],
	},
	vip: {
		listId: '5dafb75875',
		tags: ['supportive'],
	},
};

/**
  * This controller will receive create, update, delete hooks from raisely
  * to update other services
  */
class Mailchimp extends AirblastController {
	async process({ data }) {
		if (data.type === 'user.deleted') return this.deletePerson(data);
		if (data.type === 'user.forgotten') return this.forgetPerson(data);

		const updateTypes = ['user.updated', 'user.created'];
		if (updateTypes.includes(data.type)) return this.updatePerson(data);

		this.log(`Unknown event type ${data.type}, ignoring`);
		return null;
	}

	async updatePerson(data) {
		const person = data.data;
		if (person.unsubscribedAt) {
			this.log(`(Person ${person.uuid}) is unsubscribed, skipping`);
			return;
		}
		if (!person.email || person.email.endsWith('.invalid')) {
			this.log(`(Person ${person.uuid}) has dummy email address (${person.email}). Skipping`);
			return;
		}
		const personTags = _.get(person, 'tags', []).map(t => t.path);
		const onLists = _.map(lists, (config, name) => {
			let onList = false;
			// Do they have a tag
			if (config.tags) onList = _.intersection(config.tags, personTags).length;
			// See if at least one of those fields is truthy
			if (!onList && config.fields) onList = config.fields.find(field => _.get(person, field));

			// If they're on the list, sync them
			return onList ? name : null;
		})
		// Filter out lists that they didn't qualify for
			.filter(l => l);

		console.log(`Syncing ${person.uuid} with lists ${onLists.join(',')} `);
		// Check if this makes them a VIP on the standard list
		const vip = onLists.filter(l => l !== 'standard').length;
		// Sync them to all lists they should be on
		await Promise.all(onLists.map((listName) => {
			const { listId } = lists[listName];
			if (!this.mailchimp) this.mailchimp = new MailchimpService(process.env.MAILCHIMP_KEY);
			return this.mailchimp.syncPersonToList(person, listId, !!((listName === 'standard') && vip));
		}));
	}

	async forget(data) {
		// FIXME TODO
	}
}

Mailchimp.options = options;

module.exports = Mailchimp;
