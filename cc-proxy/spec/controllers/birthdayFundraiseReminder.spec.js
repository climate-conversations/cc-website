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
			expect(mockResponse.body).to.eql({
				nextBirthdayUpdated: [],
				nextBirthdayPassedUpdated: [],
			});
		});
	});

	describe('valid data', () => {
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
								dateOfBirth: '2022-05-03T00:00:00.000Z',
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
							dateOfBirth: '2022-05-03T00:00:00.000Z',
						},
					},
				],
				nextBirthdayPassedUpdated: [],
			});
		});

		it('expects patch body to be updated correctly', () => {
			expect(patchBody).to.eql({
				data: { private: { nextBirthday: '2022-05-03T00:00:00.000Z' } },
			});
		});
	});
});

// update nextBirthday only
// update nextBirthdayUpdate only
// bothv
// invalid dateOfBirth
// invalid nextBirthday

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
				nextBirthday: dayjs('1995-05-03T00:00:00.000Z')
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
