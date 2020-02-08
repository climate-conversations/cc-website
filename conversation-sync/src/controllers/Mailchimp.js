/* eslint-disable class-methods-use-this */
const { AirblastController } = require('airblast');
const _ = require('lodash');
const { raiselyRequest } = require('../helpers/raiselyHelpers');

const MailchimpService = require('../services/mailchimp');

const options = {
	wrapInData: true,
};

const partnerTags = ['partner', 'government'];

// Anyone who donates more than $100 is added to vip list
// (amounts are stored in cents on raisely)
const VIP_DONOR_THRESHOLD = 10000

const lists = {
	standard: {
		listId: '6741425dab',
		tags: ['facilitator', 'team-leader'],
		fields: ['private.host', 'private.volunteer', 'private.newsletter', 'private.mailingList'],
		condition: (user, tags) => _.get(user, 'private.attendedConversation') && !(_.intersection(partnerTags, tags).length),
	},
	partner: {
		listId: '56d48ee1bb',
		tags: partnerTags,
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
		if (data.type.startsWith('donation.')) return this.donorSync(data);

		const updateTypes = ['user.updated', 'user.created'];
		if (updateTypes.includes(data.type)) return this.updatePerson(data);

		this.log(`Unknown event type ${data.type}, ignoring`);
		return null;
	}

	async donorSync(data) {
		const donation = data.data;
		const { user } = donation;
		if (donation.campaignAmount < 10000) {
			// Fetch other donations to see if it's in excess of 100
			const donations = await raiselyRequest({
				path: `/user/${user.uuid}/donations?limit=100`,
				token: process.env.RAISELY_TOKEN,
			});
			const sum = donations.reduce((total, d) => d.campaignAmount + total, 0);
			if (sum < 10000) return;
		}

		// They've donated more than $100, add them to VIP and mark them VIP on standard list
		if (!this.mailchimp) this.mailchimp = new MailchimpService(process.env.MAILCHIMP_KEY);
		this.mailchimp.syncPersonToList(user, lists.standard.listId, true);
		this.mailchimp.syncPersonToList(user, lists.vip.listId, false);
	}

	async updatePerson(data) {
		const person = data.data;
		if (person.unsubscribedAt) {
			this.log(`(Person ${person.uuid}) is unsubscribed, skipping`);
			return;
		}
		if (!person.email || person.email.endsWith('.invalid') || person.email.indexOf('@') === -1) {
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
			if (!onList && config.condition) onList = config.condition(person, personTags);

			// If they're on the list, sync them
			return onList ? name : null;
		})
		// Filter out lists that they didn't qualify for
			.filter(l => l);

		if (onLists.length) {
			console.log(`Syncing ${person.uuid} with lists ${onLists.join(',')} `);
			// Check if this makes them a VIP on the standard list
			const vip = onLists.filter(l => l !== 'standard').length;
			// Sync them to all lists they should be on
			await Promise.all(onLists.map((listName) => {
				const { listId } = lists[listName];
				if (!this.mailchimp) this.mailchimp = new MailchimpService(process.env.MAILCHIMP_KEY);
				return this.mailchimp.syncPersonToList(person, listId, !!((listName === 'standard') && vip));
			}));
		} else {
			console.log(`${person.uuid} no lists to sync`);
		}
	}

	async forget(data) {
		// FIXME TODO
	}
}

Mailchimp.options = options;

module.exports = Mailchimp;
