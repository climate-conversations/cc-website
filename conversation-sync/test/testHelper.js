const nock = require('nock');
const chai = require('chai');
const chaiSubset = require('chai-subset');

chai.use(chaiSubset);

function nockRaisely() {
	return nock('https://api.raisely.com/v3')
		// .log(console.log);
}

module.exports = {
	nockRaisely,
}
