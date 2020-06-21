const Mailchimp = require('mailchimp-api-v3');
const md5 = require('md5');
const _ = require('lodash');
const tzc = require('timezonecomplete');
const NanoCache = require('nano-cache');
const cache = new NanoCache({
	ttl: 10 * 60 * 1000,
	limit: 5,
});

const tagsToSync = ['Facilitator', 'Team Leader', 'Coordinator', 'Corporate', 'Government', 'Partner', 'Supportive']
	.map(n => _.kebabCase(n));

function mailchimpPayload(person, vip, listInterests) {
	const fieldMap = {
		FNAME: 'firstName',
		PNAME: 'preferredName',
		FULLNAME: 'fullName',
		ORG: 'private.organisation',
		PHONE: 'phoneNumber',
	};

	const values = {
		vip,
		merge_fields: {},
		interests: {},
	};

	const interestMap = {
		Host: 'private.host',
		Volunteer: 'private.volunteer',
		'Host Corporate': 'private.hostCorporate',
		Facilitate: 'private.facilitate',
		MailingList: 'private.mailingList',
	};

	// Mailchimp needs interests in the form [id]: true/false
	// So we need to find the interests by name to retrieve their id
	_.forEach(interestMap, (path, name) => {
		const interest = listInterests.find(i => i.name.toLowerCase() === name.toLowerCase());
		if (interest) {
			const value = _.get(person, path);
			// Set the key only if it's explicitly set
			// if it's not, just ignore it
			if (value || value === false) values.interests[interest.id] = !!value;
		}
	});

	_.forEach(fieldMap, (path, key) => {
		const value = _.get(person, path);
		if (value) values.merge_fields[key] = value;
	});

	// Save donor stats if present
	if (person.donorStats) {
		Object.assign(values.merge_fields, {
			LASTGIFTON: new tzc.DateTime(person.donorStats.lastGiftAt).format('YYYY-MM-dd'),
			LASTGIFT: person.donorStats.lastGiftDollars,
			TOTALGIFTS: person.donorStats.total,
			GIFTCOUNT: person.donorStats.giftCount,
			REGGIFTS: person.donorStats.activeSubscriptionCount,
		});
	}

	if (_.get(person, )) values.merge_fields.BIRTHDAY = new tzc.DateTime(person.private.dateOfBirth).format('MM/dd');

	return values;
}

const personHash = (person) => md5(person.email.toLowerCase());

let interestPromises = {};

class MailchimpService {
	constructor(key) {
		this.mailchimp = new Mailchimp(key);
	}

	async loadInterests(listId) {
		console.log(`Loading interests for ${listId}`)
		const interestCategories = await this.mailchimp.get(`/lists/${listId}/interest-categories`);
		const category = interestCategories.categories.find(ic => ic.title === 'Interests');
		const interestsResponse = await this.mailchimp.get(`/lists/${listId}/interest-categories/${category.id}/interests`);
		const interests = interestsResponse.interests;
		return interests;
	}

	async loadCachedInterests(listId) {
		const cacheKey = `interests-${listId}`;
		let interests = cache.get(cacheKey);
		if (!interests) {
			if (!interestPromises[cacheKey]) interestPromises[cacheKey] = this.loadInterests(listId);
			interests = await interestPromises[cacheKey];
			interestPromises[cacheKey] = null;
			cache.set(cacheKey, interests);
		}
		return interests;
	}

	async addToList(person, listId, vip, interests) {
		const payload = mailchimpPayload(person, vip, interests);
		const signupDate = new tzc.DateTime(person.createdAt).convert(tzc.TimeZone.utc()).format('yyyy-MM-dd HH:mm:ss')

		console.log(`Mailchimp: Add ${person.uuid} to list ${listId}`, signupDate, payload.merge_fields.PHONE);
		return this.mailchimp.post(`/lists/${listId}/members?skip_merge_validation=true`, Object.assign({
			email_address: person.email,
			email_type: 'html',
			status: 'subscribed',
			timestamp_signup: signupDate,
		}, payload));
	}

	async resubscribe(person, listId) {
		// If someone requires resubscribing, then we must set them
		// to pending
		const hash = personHash(person);
		console.log(`Mailchimp: Resubscribe ${person.uuid}`);

		return this.mailchimp.patch(`/lists/${listId}/members/${hash}`, {
			status: 'pending',
		});
	}

	async setTags(person, listId, personExistingTags) {
		if (!person.tags) {
			console.log('No tags present, skipping');
			return;
		}
		const hash = personHash(person);
		personExistingTags.forEach(t => { t.kebabName = _.kebabCase(t.name) });
		const personTags = person.tags.map(t => _.kebabCase(t.path));
		// Get tag list
		const segmentUrl = `/lists/${listId}/segments?type=static&count=100`;
		let segments = cache.get(segmentUrl);
		if (!segments) {
			if (!this.chimpPromises) this.chimpPromises = {};
			if (!this.chimpPromises[segmentUrl]) this.chimpPromises[segmentUrl] = this.mailchimp.get(segmentUrl);
			const segmentsResponse = await this.chimpPromises[segmentUrl]
			segments = segmentsResponse.segments;
			cache.set(segmentUrl, segments);
		}
		// Tags are a subset of segments, type static
		const existingTags = segments
			.filter(s => s.type === 'static')
			.map(t => {
				t.kebabName = _.kebabCase(t.name);
				return t;
			});

		// Create any missing tags
		const missingTags = personTags
			.filter(name => !existingTags.find(t => t.kebabName === name));
		for (const i in missingTags) {
			const kebabName = missingTags[i];
			const newTag = await this.mailchimp.post(`/lists/${listId}/segments`, {
				name: _.startCase(kebabName),
				static_segment: [],
			});
			newTag.kebabName = kebabName;
			existingTags.push(newTag);
			console.log(`Mailchimp list ${listId}: Created missing mailchimp tag ${kebabName}`);
		}

		// Add tags to user
		const tagsToAdd = existingTags
			.filter(tag =>
				personTags.find(t => t === tag.kebabName) &&
				!personExistingTags.find(existing => existing.kebabName === tag.id))
		for (const i in tagsToAdd) {
			const tag = tagsToAdd[i];
			// Add tags to user
			await this.mailchimp.post(`/lists/${listId}/segments/${tag.id}/members`, {
				email_address: person.email,
			});
		}
		console.log(`Mailchimp list ${listId}, Person ${person.uuid}: Tagged ${tagsToAdd.map(t => t.name).join(',') || '(none)'}`);

		// Delete old tags from user, but only if they're in the sync list
		const tagsToDelete = personExistingTags
			.filter(tag =>
				(tagsToSync.find(name => name === tag.kebabName) &&
				!personTags.find(name => name === tag.kebabName)));
		for (const i in tagsToDelete) {
			const tag = tagsToDelete[i];
			// const tag = existingTags.find(t => t.kebabName === tagName);
			await this.mailchimp.delete(`/lists/${listId}/segments/${tag.id}/members/${hash}`);
		}
		console.log(`Mailchimp list ${listId}, Person ${person.uuid}: Untagged ${tagsToDelete.map(t => t.name).join(',') || '(none)'}`);
	}

	async syncPersonToList(person, listId, vip) {
		const interests = await this.loadCachedInterests(listId);

		const hash = personHash(person);
		let listEntry;
		let shouldUpdate = false;
		// True if the person is successfully subscribed and we can tag and add interests to them
		let canTag = true;
		try {
			listEntry = await this.mailchimp.get(`/lists/${listId}/members/${hash}`);
			// If they are pending or unsubscribed we won't be able to re-add them
			shouldUpdate = listEntry.status === 'subscribed';
			canTag = shouldUpdate;
			if (!canTag) console.log(`Mailchimp list ${listId}, Person ${person.uuid} person is unsubscribed`);
		} catch (e) {
			// Person is not in the list
			if (e.status == 404) {
				listEntry = await this.addToList(person, listId, vip, interests);
			} else {
				// Unknown error, throw it
				throw e;
			}
		}
		if (shouldUpdate) {
			// Try and resubscribe it they're not already
			if (listEntry.status !== 'subscribed') await this.resubscribe(person, listId);
			const payload = mailchimpPayload(person, vip, interests);
			console.log(`Mailchimp list ${listId}, Person ${person.uuid}: Updating merge fields (birthday ${payload.merge_fields.BIRTHDAY}, last gift on ${payload.merge_fields.LASTGIFTON})`);
			await this.mailchimp.patch(`/lists/${listId}/members/${hash}`, payload);
		}

		if (canTag) await this.setTags(person, listId, listEntry.tags);
	}
}

module.exports = MailchimpService;
