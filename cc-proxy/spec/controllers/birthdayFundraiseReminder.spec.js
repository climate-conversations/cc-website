const chai = require('chai');
const nock = require('nock');
const _ = require('lodash');

require('../spec.env.js');

const MockRequest = require('../utils/mockRequest');

const {
	birthdayFundraiseReminder,
} = require('../../src/birthdayFundraiseReminder');

const { expect } = chai;

// update nextBirthday only
// update nextBirthdayUpdate only
// both
// none
// invalid dateOfBirth
// invalid nextBirthday
// both invalid
