const nock = require('nock');
const _ = require('lodash');
const md5 = require('md5');
const NanoCache = require("nano-cache");

class MailchimpNock {
	constructor(listId, email) {
		this.listId = listId;
		this.hash = md5(email.toLowerCase());
		this.scope = nock("https://us16.api.mailchimp.com").persist();
		// .log(console.log);
		this.calls = {};

		this.increment = (counter, status, body) => {
			return () => {
				const count = _.get(this.calls, counter);
				_.set(this.calls, counter, count + 1);
				return [status, body];
			};
		};
		this.noteTag = (counter, status, body) => {
			return (uri, reqBody) => {
				const name = _.kebabCase(reqBody.name) || uri.split("/")[5];
				const array = _.get(this.calls, counter);
				array.push(name);
				const result = _.isFunction(body) ? body(uri, reqBody) : body;
				return [status, result];
			};
		};
		this.formatTags = (tags) => tags.map((tag) => this.formatTag(tag));
		this.formatTag = (tag) => ({
			id: _.kebabCase(tag),
			name: _.startCase(tag),
			type: "static",
		});
	}

	reset() {
		nock.cleanAll();
	}

	getUser(status, body) {
		_.set(this, "calls.user.get", 0);
		this.scope.get(`/3.0/lists/${this.listId}/members/${this.hash}`).reply(
			this.increment("user.get", status, {
				...body,
				statusCode: status,
			})
		);
	}

	createUser(status, returnBody) {
		_.set(this, "calls.user.create", 0);
		this.scope
			.post(
				`/3.0/lists/${this.listId}/members?skip_merge_validation=true`
			)
			.reply(this.increment("user.create", status, returnBody));
	}

	updateUser() {
		_.set(this, "calls.user.update", 0);
		this.scope
			.patch(`/3.0/lists/${this.listId}/members/${this.hash}`)
			.reply(this.increment("user.update", 200, { tags: [] }));
	}

	getTags(tags) {
		_.set(this, "calls.tags.get", 0);
		this.scope
			.get(`/3.0/lists/${this.listId}/segments?type=static&count=100`)
			.reply(
				this.increment("tags.get", 200, {
					segments: this.formatTags(tags),
				})
			);
	}
	createTags() {
		_.set(this, "calls.tags.create", []);
		this.scope.post(`/3.0/lists/${this.listId}/segments`).reply(
			this.noteTag("tags.create", 200, (uri, body) => ({
				id: _.kebabCase(body.name),
				name: body.name,
			}))
		);
	}
	addTags() {
		_.set(this, "calls.tags.add", []);
		this.scope
			.post(/lists\/.*\/segments\/.*\/members/)
			.reply(
				this.noteTag("tags.add", 200, (uri, body) =>
					this.formatTag(body.name)
				)
			);
	}
	removeTags() {
		_.set(this, "calls.tags.remove", []);
		this.scope
			.delete(/lists\/.*\/segments\/.*\/members\/.*/)
			.reply(this.noteTag("tags.remove", 200, {}));
	}
	getInterestCategories() {
		_.set(this, "calls.interestCategories.get", 0);
		this.scope.get(/lists\/.*\/interest-categories/).reply(
			this.increment("interestCategories.get", 200, {
				categories: [
					{
						title: "Interests",
						id: "INTERESTS",
					},
				],
			})
		);
	}
	getInterests() {
		_.set(this, "calls.interests.get", 0);
		this.scope.get(/lists\/.*\/interest-categories\/.*\/interests/).reply(
			this.increment("interests.get", 200, {
				interests: [
					'Host',
					'Volunteer',
					'Host Corporate',
					'Facilitate',
					'MailingList'].map(name => ({
						name,
						id: name.toUpperCase(),
					})),
			})
		);
	}
}

module.exports = MailchimpNock;
