const chai = require('chai');
const nock = require('nock');
const _ = require('lodash');

require('../spec.env.js');

const MockRequest = require('../utils/mockRequest');
const { uniqueDonors } = require('../../src/uniqueDonors');
const { expect } = chai;

describe('unique donors', () => {
	describe('single donor', () => {
		let patchBody;

		before(() => {
			nock.cleanAll();
			nock('https://api.raisely.com')
				.get(
					'/v3/donations?campaign=campaignUuid&profile=profileUuid&private=1'
				)
				.reply(200, singleDonorResponse);

			nock('https://api.raisely.com')
				.patch('/v3/profiles/profileUuid')
				.reply((uri, requestBody) => {
					patchBody = requestBody;
					return [200];
				});
			const request = prepareUniqueDonorsRequest();
			return uniqueDonors(request);
		});

		it('multiple donors', () => {
			expect(patchBody.data.public.uniqueDonors).to.eq(2);
		});
	});

	describe('multiple donors', () => {
		before(() => {
			nock.cleanAll();
			nock('https://api.raisely.com')
				.get(
					'/v3/donations?campaign=campaignUuid&profile=profileUuid&private=1'
				)
				.reply(200, multipleDonorsResponse);

			nock('https://api.raisely.com')
				.patch('/v3/profiles/profileUuid')
				.reply((uri, requestBody) => {
					patchBody = requestBody;
					return [200];
				});
			const request = prepareUniqueDonorsRequest();
			return uniqueDonors(request);
		});

		it('multiple donors', () => {
			expect(patchBody.data.public.uniqueDonors).to.eq(3);
		});
	});

	describe('muliple donors with repeated emails', () => {
		before(() => {
			nock.cleanAll();
			nock('https://api.raisely.com')
				.get(
					'/v3/donations?campaign=campaignUuid&profile=profileUuid&private=1'
				)
				.reply(200, multipleDonorsWithRepeatedEmailsResponse);

			nock('https://api.raisely.com')
				.patch('/v3/profiles/profileUuid')
				.reply((uri, requestBody) => {
					patchBody = requestBody;
					return [200];
				});
			const request = prepareUniqueDonorsRequest();
			return uniqueDonors(request);
		});

		it('multiple donors', () => {
			expect(patchBody.data.public.uniqueDonors).to.eq(4);
		});
	});
});

const prepareUniqueDonorsRequest = () => {
	return new MockRequest({
		headers: {
			origin: 'https://climateconversations.raisely.com',
		},
		method: 'POST',
		url: '/',
		body: {
			data: {
				data: {
					campaignUuid: 'campaignUuid',
					profile: {
						uuid: 'profileUuid',
					},
				},
			},
		},
	});
};

const singleDonorResponse = {
	data: [
		{
			user: {
				email: 'angkj.nicholas@gmail.com',
			},
		},
		{
			email: 'ok@gmail.com',
		},
	],
};

const multipleDonorsResponse = {
	data: [
		{
			user: {
				email: 'angkj.nicholas@gmail.com',
			},
		},
		{
			email: 'ok@gmail.com',
		},
		{
			email: 'hello@gmail.com',
		},
	],
};
const multipleDonorsWithRepeatedEmailsResponse = {
	data: [
		{
			user: {
				email: 'angkj.nicholas@gmail.com',
			},
		},
		{
			email: 'ok@gmail.com',
		},
		{
			email: 'ok@gmail.com',
		},
		{
			email: 'ok@gmail.com',
		},
		{
			email: 'hello@gmail.com',
		},
		{
			email: 'hello@gmail.com',
		},
		{
			email: 'test@gmail.com',
		},
	],
};
// mock request first
// should mock the muliple data
// nock the 2 api calls
// nock(RAISELY_API)
// 	.post('/v3/profiles/${UUID}')
// 	.reply((uri, body) => {
// 		patchBody = body; // to check body contains no duplicated email (donor count)
// 	});

// create mock request to pass into uniqueDonors
// to nock:
// get all donations
// patchProfileDonorCount
// expect response to be equal to the mock response

// test cases:

// single donor
// multiple donors
// multiple donors with repeated emails
