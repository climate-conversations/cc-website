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

describe('test', () => {
	let patchBody;

	before(() => {
		nock.cleanAll();

		nock('https://api.raisely.com')
			.get(
				'/v3/users?private=1&nextBirthdayAbsent=1&dateOfBirthPresent=1'
			)
			.reply(200, invalidDateOfBirthResponse);
		nock('https://api.raisely.com')
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

// update nextBirthday only
// update nextBirthdayUpdate only
// both
// invalid dateOfBirth
// invalid nextBirthday

const emptyResponse = {
	nextBirthdayUpdated: [],
	nextBirthdayPassedUpdated: [],
};

const validDateOfBirthResponse = {
	data: [
		{
			private: {
				dateOfBirth: '1995-05-03T00:00:00.000Z',
			},
		},
	],
};

const invalidDateOfBirthResponse = {
	data: [
		{
			private: {
				dateOfBirth: 'invalid date',
			},
		},
	],
};

const validNextBirthdayResponse = {
	data: [
		{
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
			private: {
				nextBirthday: 'invalid date',
			},
		},
	],
};
