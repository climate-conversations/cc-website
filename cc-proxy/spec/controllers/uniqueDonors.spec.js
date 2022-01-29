const chai = require('chai');
const nock = require('nock');
const request = require('request-promise-cache');
const _ = require('lodash');

require('../spec.env.js');

const MockResponse = require('../utils/mockResponse');
const MockRequest = require('../utils/mockRequest');
const { uniqueDonors } = require('../../src/uniqueDonors');
const { expect } = chai;
// before block to sets off the nocks
// several it statements to check:
// wrong campaignUuid
// wrong uuid
// check for the right respons

describe('unique donors', () => {
	let patchBody;
	before(() => {
		nock.cleanAll();
		nock('https://api.raisely.com')
			.get(
				'/v3/donations?campaign=campaignUuid&profile=profileUuid&private=1'
			)
			.reply((uri, requestBody) => {
				console.log('uri: ', uri);
				console.log('requestBody: ', requestBody);
				return [200, {}];
			});

		const request = prepareUniqueDonorsRequest();
		return uniqueDonors(request);
	});
	// some filler code
	it('it works', () => {
		// uniqueDonors(request);
		const a = 1;
		expect(a).to.eq(1);
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

// what should i be testing exactly? x.x
// the objective is to make sure that the uniqueDonors are updated, but the patch request is already validated
