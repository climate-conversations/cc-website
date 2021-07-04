require('../spec.env');

const chai = require("chai");
const request = require("request-promise-cache");
const _ = require("lodash");
const nock = require('nock');

const MockResponse = require("../utils/mockResponse");
const MockRequest = require("../utils/mockRequest");
const { hostReport, facilReport } = require("../../src");

const { expect } = chai;

const { statusOk, nockRaisely } = require("./shared");

const eventUuid = 'event-uuid';
const eventUuids = ['event-uuid1', 'event-uuid2', 'event-uuid3'];
const facilUuid = 'facil-uuid';

describe('hostReport', () => {
	describe('Correctly compiles', () => {
		let results = {};
		before(() => {
			results.req = new MockRequest({
				method: "GET",
				url: `/${eventUuid}?pre=pre-category&post=post-category`,
				headers: {
					Origin: "https://climateconversations.raisely.com"
				},
			});
			results.res = new MockResponse();
			nock.cleanAll();
			request.cache.clear();
			setHostReportNocks();
			return hostReport(results.req, results.res);
		});
		statusOk(results);
		it('has correct actions', () => {
			expect(results.res.body.data).to.containSubset({
				actions: ['hosts', 'facilitators', 'donations', 'volunteers']
					.map((action, index) =>
						({ label: action, value: index })),
			});
		});
		it('has correct attitudes', () => {
			expect(results.res.body.data).to.containSubset({
				attitudes: [
					{
						id: "increased-talkativeness",
						value: 0,
					},
					{
						id: "increased-priority",
						value: 4
					},
					{
						id: "high-priority",
						value: 2
					},
					{
						id: "increased-hope",
						value: 1
					},
					{
						id: "increased-agency",
						value: 3,
					},
					{
						id: "high-agency",
						value: 0,
					},
					{
						id: "highly-recomends",
						value: 1,
					}
				]
			});
		});
	});
});

describe('facilReport', () => {
	describe("Correctly compiles", () => {
		let results = {};
		before(() => {
			results.req = new MockRequest({
				method: "GET",
				url: `/${facilUuid}?pre=pre-category&post=post-category`,
				headers: {
					Origin: "https://climateconversations.raisely.com"
				}
			});
			results.res = new MockResponse();
			nock.cleanAll();
			request.cache.clear();
			setFacilReportNocks();
			return facilReport(results.req, results.res);
		});
		statusOk(results);
		it("has correct attendees", () => {
			expect(results.res.body.data).to.containSubset({
				attendees: 5
			});
		});
		it("has correct attitudes", () => {
			expect(results.res.body.data).to.containSubset({
				attitudes: [
					{
						id: "increased-talkativeness",
						value: 1
					},
				]
			});
		});
	});
});

const toInteraction = ({ userUuid, ...values }) => ({ userUuid, detail: { private: values }});

function setHostReportNocks() {
	nockRaisely()
		.get(`/events/${eventUuid}?private=1`)
		.reply(200, {
			data: { startAt: "2019-02-23" }
		})
		.get(`/event_rsvps?private=1&event=${eventUuid}`)
		.reply(200, {
			// Should add up to 2 donors
			data: [
				{ type: "host", private: {} },
				{ type: "guest", private: {} },
				{ type: "guest", private: { donationIntention: "no" } },
				{ type: "guest", private: { donationIntention: "cash" } },
				{ type: "guest", private: { donationIntention: "credit" } }
			]
		})
		.get(
			`/interactions?category=pre-category&private=1&referenceIn=${encodeURIComponent(JSON.stringify([eventUuid]))}`
		)
		.reply(200, {
			data: [
				{
					userUuid: "u1",
					talkativeness: 5,
					priority: 7,
					hope: 7,
					agency: 7
				},
				{
					userUuid: "u2",
					talkativeness: 9,
					priority: 0,
					hope: 6,
					agency: 5
				},
				{ userUuid: "u4", priority: 4, hope: 1, agency: 0 },
				{
					userUuid: "u3",
					talkativeness: 5,
					priority: 4,
					hope: 0,
					agency: 0
				}
			].map(toInteraction)
		})
		.get(
			`/interactions?category=post-category&private=1&referenceIn=${encodeURIComponent(JSON.stringify([eventUuid]))}`
		)
		.reply(200, {
			data: [
				{
					userUuid: "u1",
					host: false,
					talkativeness: 5,
					priority: 8,
					hope: 6,
					agency: 6,
					recommend: 9
				},
				{
					userUuid: "u2",
					facilitate: true,
					volunteer: true,
					talkativeness: 8,
					agency: 7,
					priority: 10,
					hope: 7,
					recommend: 5
				},
				{
					userUuid: "u3",
					volunteer: true,
					priority: 5,
					agency: 5,
					recommend: 0
				},
				{
					userUuid: "u4",
					volunteer: true,
					talkativeness: 5,
					priority: 5,
					agency: 7
				}
			].map(toInteraction)
		});
}

function setFacilReportNocks() {
	nockRaisely()
		.get(`/event_rsvps?private=1&user=${facilUuid}&type=facilitator`)
		.reply(200, {
			data: [{ eventUuid: "event-uuid1" }, { eventUuid: "event-uuid2" }]
		})
		.get(`/event_rsvps?private=1&user=${facilUuid}&type=co-facilitator`)
		.reply(200, {
			data: [{ eventUuid: "event-uuid3" }]
		})
		.get(`/event_rsvps?private=1&event=${encodeURIComponent(eventUuids.join(","))}`)
		.reply(200, {
			// Should add up to 2 donors
			data: [
				{ type: "host", userUuid: 'u1' },
				{ type: "guest", userUuid: 'u2' },
				{ type: "guest", userUuid: 'u4', },
				{ type: "co-host", userUuid: 'u1' },
				{ type: "guest", userUuid: 'u5' },
				{ type: "guest", userUuid: 'u3' }
			]
		})
		.get(
			`/interactions?category=pre-category&private=1&referenceIn=${encodeURIComponent(JSON.stringify(eventUuids))}`
		)
		.reply(200, {
			data: [
				{
					userUuid: "u1",
					talkativeness: 5,
					priority: 7,
					hope: 7,
					agency: 7
				},
				{
					userUuid: "u2",
					talkativeness: 9,
					priority: 0,
					hope: 6,
					agency: 5
				},
				{ userUuid: "u4", priority: 4, hope: 1, agency: 0 },
				{
					userUuid: "u3",
					talkativeness: 5,
					priority: 4,
					hope: 0,
					agency: 0
				}
			].map(toInteraction)
		})
		.get(
			`/interactions?category=post-category&private=1&referenceIn=${encodeURIComponent(JSON.stringify(eventUuids))}`
		)
		.reply(200, {
			data: [
				{
					userUuid: "u1",
					host: false,
					talkativeness: 9,
					priority: 8,
					hope: 6,
					agency: 6,
					recommend: 9
				},
				{
					userUuid: "u2",
					facilitate: true,
					volunteer: true,
					talkativeness: 8,
					agency: 7,
					priority: 10,
					hope: 7,
					recommend: 5
				},
				{
					userUuid: "u3",
					volunteer: true,
					priority: 5,
					agency: 5,
					recommend: 0
				},
				{
					userUuid: "u4",
					volunteer: true,
					talkativeness: 5,
					priority: 5,
					agency: 7
				}
			].map(toInteraction)
		});
}
