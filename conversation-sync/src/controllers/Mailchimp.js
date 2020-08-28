/* eslint-disable class-methods-use-this */
const { AirblastController } = require('airblast');
const _ = require('lodash');
const { raiselyRequest } = require('../helpers/raiselyHelpers');

const MailchimpService = require('../services/mailchimp');

const options = {
	wrapInData: true,
};

const partnerTags = ['partner', 'government','corporate'];

// Anyone who donates more than $120 is added to vip list
// (amounts are stored in cents on raisely)
const VIP_DONOR_THRESHOLD = process.env.VIP_DONOR_THRESHOLD_CENTS;

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
		// Fetch other donations to see if it's in excess of VIP_DONOR_THRESHOLD
		const [donations, subscriptions] = await Promise.all([
			raiselyRequest({
				path: `/users/${user.uuid}/donations?limit=100&sort=createdAt&order=DESC&status=OK`,
				token: process.env.RAISELY_TOKEN,
			}),
			raiselyRequest({
				path: `/users/${user.uuid}/subscriptions?limit=100`,
				token: process.env.RAISELY_TOKEN,
			}),
		]);
		const sum = donations.reduce((total, d) => d.campaignAmount + total, 0);
		// If they haven't donated more that the threshold amount
		// don't add them to VIP list
		const isVIP = (sum >= VIP_DONOR_THRESHOLD);

		const activeSubscriptionCount = subscriptions.filter(s => s.status === 'OK').length;

		const mostRecent = donations[0];
		if (!mostRecent) {
			throw new Error(`Weird, donor ${donation.uuid} doesn't have any donations?`);
		}

		// Add some recent donor stats to use for filtering
		user.donorStats = {
			lastGiftDollars: Math.round(mostRecent.campaignAmount / 100),
			lastGiftAt: mostRecent.createdAt,
			// Convert to dollars as integer
			total: Math.round(sum / 100),
			giftCount: donations.length,
			activeSubscriptionCount,
		}

		console.log(`Syncing donor ${user.uuid}, vip? ${isVIP}, total gifts: $${user.donorStats.total}`);

		// They've donated more than $100, add them to VIP and mark them VIP on standard list
		if (!this.mailchimp) this.mailchimp = new MailchimpService(process.env.MAILCHIMP_KEY);
		const promises = [this.mailchimp.syncPersonToList(user, lists.standard.listId, isVIP)];
		if (isVIP) promises.push(this.mailchimp.syncPersonToList(user, lists.vip.listId, false));
		return Promise.all(promises);
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
