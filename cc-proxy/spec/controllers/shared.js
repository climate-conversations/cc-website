const { pick } = require('lodash');
const { expect } = require('chai');
const nock = require('nock');

function itReturnsMinimalUser(results) {
	it('returns minimal user', () => {
		expect(results.res.body).to.eql({
			data: pick(results.user, ['preferredName', 'uuid']),
		});
	});
}

function statusOk(results) {
	it('status 200', () => {
		expect(results.res.statusCode).to.eq(200);
	});
}

function nockRaisely() {
	return nock("https://api.raisely.com/v3").log(console.log);
}

module.exports = {
	itReturnsMinimalUser,
	statusOk,
	nockRaisely,
};
