const chai = require('chai');
const nock = require('nock');
const _ = require('lodash');
const dayjs = require('dayjs');

require('../spec.env.js');

const MockRequest = require('../utils/mockRequest');
const MockResponse = require('../utils/mockResponse');

const {
	birthdayFundraiseReminder,
} = require('../../src/birthdayFundraiseReminder');

const { expect } = chai;
let currentYear = dayjs().get('year');
let nextYear = dayjs()
	.add(1, 'year')
	.get('year');

describe('fundraise reminder', () => {
	describe('invalid data', () => {
		before(() => {
			nock.cleanAll();

			nock('https://api.raisely.com')
				.get(
					'/v3/users?private=1&nextBirthdayAbsent=1&dateOfBirthPresent=1'
				)
				.reply(200, invalidDateOfBirthResponse)
				.get(`/v3/users`)
				.query({
					'private': true,
					'private.nextBirthdayLTE': /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/,
				})
				.reply(200, invalidNextBirthdayResponse);
		});

		it('emptyResponse', async () => {
			let mockResponse = new MockResponse();
			await birthdayFundraiseReminder(new MockRequest(), mockResponse);
			expect(mockResponse.body).to.eql(emptyResponse);
		});
	});

	describe('valid birthday data', () => {
		let patchBody;
		before(() => {
			nock.cleanAll();

			nock('https://api.raisely.com')
				.get(
					'/v3/users?private=1&nextBirthdayAbsent=1&dateOfBirthPresent=1'
				)
				.reply(200, validDateOfBirthResponse)
				.get(`/v3/users`)
				.query({
					'private': true,
					'private.nextBirthdayLTE': /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/,
				})
				.reply(200, invalidNextBirthdayResponse);

			nock('https://api.raisely.com')
				.patch('/v3/users/1')
				.reply((uri, requestBody) => {
					patchBody = requestBody;
					return (
						200,
						{
							uuid: 1,
							private: {
								dateOfBirth: `${currentYear}-05-03T00:00:00.000Z`, // change this to the current year
							},
						}
					);
				});
		});

		it('expects nextBirthdayUpdated field to be updated', async () => {
			let mockResponse = new MockResponse();
			await birthdayFundraiseReminder(new MockRequest(), mockResponse);
			expect(mockResponse.body).to.eql({
				nextBirthdayUpdated: [
					{
						uuid: 1,
						private: {
							dateOfBirth: `${currentYear}-05-03T00:00:00.000Z`,
						},
					},
				],
				nextBirthdayPassedUpdated: [],
			});
		});

		it('expects patch body to be updated correctly', () => {
			expect(patchBody).to.eql({
				data: {
					private: {
						nextBirthday: `${currentYear}-05-03T00:00:00.000Z`,
					},
				},
			});
		});
	});

	describe('valid nextBirthdayData', () => {
		let patchBody;
		let patchBody2;

		before(() => {
			nock.cleanAll();

			nock('https://api.raisely.com')
				.get(
					'/v3/users?private=1&nextBirthdayAbsent=1&dateOfBirthPresent=1'
				)
				.reply(200, validDateOfBirthResponse)
				.get(`/v3/users`)
				.query({
					'private': true,
					'private.nextBirthdayLTE': /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/,
				})
				.reply(200, validNextBirthdayResponse);

			nock('https://api.raisely.com')
				.patch('/v3/users/1')
				.reply((uri, requestBody) => {
					patchBody = requestBody;
					return (
						200,
						{
							uuid: 1,
							private: {
								dateOfBirth: `${currentYear}-05-03T00:00:00.000Z`,
							},
						}
					);
				})
				.patch('/v3/users/1')
				.reply((uri, requestBody) => {
					patchBody2 = requestBody;
					return (
						200,
						{
							uuid: 1,
							private: {
								dateOfBirth: `${nextYear}-05-03T00:00:00.000Z`,
							},
						}
					);
				});
		});

		it('expects boths fields to be updated', async () => {
			let mockResponse = new MockResponse();
			await birthdayFundraiseReminder(new MockRequest(), mockResponse);

			expect(mockResponse.body).to.eql({
				nextBirthdayUpdated: [
					{
						uuid: 1,
						private: {
							dateOfBirth: `${currentYear}-05-03T00:00:00.000Z`,
						},
					},
				],
				nextBirthdayPassedUpdated: [],
			});
		});

		it('expects patch body to be updated correctly', () => {
			expect(patchBody).to.eql({
				data: {
					private: {
						nextBirthday: `${currentYear}-05-03T00:00:00.000Z`,
					},
				},
			});
		});

		it('expect patch body 2 to be updated correctly', () => {
			expect(patchBody2).to.eql({
				data: {
					private: {
						nextBirthday: `${nextYear}-05-03T00:00:00.000Z`,
					},
				},
			});
		});
	});
});

const emptyResponse = {
	nextBirthdayUpdated: [],
	nextBirthdayPassedUpdated: [],
};

const validDateOfBirthResponse = {
	data: [
		{
			uuid: 1,
			private: {
				dateOfBirth: '1995-05-03T00:00:00.000Z',
			},
		},
	],
};

const invalidDateOfBirthResponse = {
	data: [
		{
			uuid: 1,
			private: {
				dateOfBirth: 'invalid date',
			},
		},
	],
};

const validNextBirthdayResponse = {
	data: [
		{
			uuid: 1,
			private: {
				nextBirthday: dayjs(`${currentYear}-05-03T00:00:00.000Z`)
					.set('year', currentYear)
					.toISOString(),
			},
		},
	],
};

const invalidNextBirthdayResponse = {
	data: [
		{
			uuid: 1,
			private: {
				nextBirthday: 'invalid date',
			},
		},
	],
};
