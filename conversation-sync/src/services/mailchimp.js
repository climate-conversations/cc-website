const Mailchimp = require('mailchimp-api-v3');
const md5 = require('md5');
const _ = require('lodash');

const mailchimp = new Mailchimp(process.env.MAILCHIMP_KEY);

const tagsToSync = ['Facilitator', 'Team Leader', 'Coordinator', 'Corporate', 'Government', 'Partner', 'Supportive']
	.map(n => _.kebabCase(n));

function mailchimpPayload(person, vip) {
	return {
		vip,
		merge_fields: {
			FNAME: person.firstName,
			PNAME: person.preferredName,
			FULLNAME: person.fullName,
			HOST: _.get(person, 'private.host'),
			VOLUNTEER: _.get(person, 'private.volunteer'),
			HOSTCORPORATE: _.get(person, 'private.hostCorporate'),
			FACILITATE: _.get(person, 'private.facilitate'),
			NEWSLETTER: _.get(person, 'private.newsleter'),
		},
	};
}

const personHash = (person) => md5(person.email.toLowerCase());

async function addToList(person, listId, vip) {
	const payload = mailchimpPayload(person, vip);
	console.log(`Mailchimp: Add ${person.uuid} to list ${listId}`);
	return mailchimp.post(`/lists/${listId}/members?skip_merge_validation=true`, Object.assign({
		email_address: person.email,
		email_type: 'html',
		status: 'subscribed',
		timestamp_signup: person.createdAt,
	}, payload));
}

async function resubscribe(person, listId) {
	// If someone requires resubscribing, then we must set them
	// to pending
	const hash = personHash(person);
	console.log(`Mailchimp: Resubscribe ${person.uuid}`);

	return mailchimp.put(`/lists/${listId}/members/${hash}`, {
		status: 'pending',
	});
}

async function setTags(person, personExistingTags, listId) {
	const hash = personHash(person);
	personExistingTags.forEach(t => { t.kebabName = _.kebabCase(t.name) });
	const personTags = person.tags.map(t => _.kebabCase(t.path));
	// Get tag list
	const segments = await mailchimp.get(`/lists/${listId}/segments`);
	// Tags are a subset of segments, type static
	const existingTags = segments.segments
		.filter(s => s.type === 'static')
		.forEach(t => { t.kebabName = _.kebabCase(t.name); });

	// Create any missing tags
	const missingTags = personTags
		.filter(name => !existingTags.find(t => t.kebabName === name));
	for (const kebabName in missingTags) {
		const newTag = await mailchimp.post(`/lists/${listId}/segments`, {
			name: _.startCase(kebabName),
			static_segment: [],
		});
		newTag.kebabName = kebabName;
		existingTags.push(newTag);
	}
	console.log(`Mailchimp list ${listId}: Created missing mailchimp tags ${missingTags.join(',')}`);

	// Add tags to user
	const tagsToAdd = existingTags
		.filter(tag =>
			personTags.find(t => t === tag.kebabName) &&
			!personExistingTags.find(existing => existing.id === tag.id))
	for (const tag in tagsToAdd) {
		// Add tags to user
		await mailchimp.post(`/lists/${listId}/segments/${tag.id}/members`, {
			email_address: person.email,
		});
	}
	console.log(`Mailchimp list ${listId}, Person ${person.uuid}: Tagged ${tagsToAdd.map(t => t.name).join(',')}`);

	// Delete old tags from user, but only if they're in the sync list
	const tagsToDelete = personExistingTags
		.filter(tag =>
			(tagsToSync.find(name => tag.kebabName) &&
			!personTags.find(name => name === tag.kebabName)));
	for (const tag in tagsToDelete) {
		await mailchimp.delete(`/lists/${listId}/segments/${tag.id}/members/${hash}`);
	}
	console.log(`Mailchimp list ${listId}, Person ${person.uuid}: Untagged ${tagsToDelete.map(t => t.name).join(',')}`);
}

async function syncPersonToList(person, listId, vip) {
	const hash = personHash(person);
	let listEntry;
	try {
		listEntry = await mailchimp.get(`/lists/${listId}/members/${hash}`);
	} catch (e) {
		// Person is not in the list
		if (e.statusCode === 404) {
			await addToList(person, listId, vip);
		} else {
			// Unknown error, throw it
			throw e;
		}
	}
	if (listEntry) {
		// Try and resubscribe it they're not already
		if (!listEntry.status !== 'subscribed') await resubscribe(person, listId);
		console.log(`Mailchimp list ${listId}, Person ${person.uuid}: Updating merge fields`);
		await mailchimp.patch(`/lists/${listId}/members/${hash}`, mailchimpPayload(person, vip));
	}

	await setTags(person, listEntry.tags, listId);
}

module.exports = {
	syncPersonToList,
};
