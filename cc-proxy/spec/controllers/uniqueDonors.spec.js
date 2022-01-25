const chai = require('chai');
const nock = require('nock');
const request = require('request-promise-cache');
const _ = require('lodash');

require('../spec.env.js');

const MockResponse = require('../utils/mockResponse');
const MockRequest = require('../utils/mockRequest');
const { uniqueDonors } = require('../../src');
const { expect } = chai;

describe('wrong campaignUuid', () => {
	// some filler code
	it('it works', () => {
		const a = 1;
		expect(a).to.eq(1);
	});
});

// nock request to pass into uniqueDonors
// how should i test the internal raisely functions?
// expect response to be equal to the mock response

// test cases:
// wrong campaignUuid
// wrong uuid
// single donor
// multiple donors
// multiple donors with repeated emails
// what should i be testing exactly? x.x
