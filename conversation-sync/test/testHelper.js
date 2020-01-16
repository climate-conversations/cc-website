const nock = require('nock');
const chai = require('chai');
const chaiSubset = require('chai-subset');

chai.use(chaiSubset);

const facilitator = {
	uuid: 'facilitator-uuid',
	fullName: 'Test Facilitator',
	photoUrl: '/photo.jpg'
};
const host = {
	uuid: 'host-uuid',
	fullName: 'Test Host',
	photoUrl: '/host-photo.jpg'
}

function nockRaisely() {
	return nock('https://api.raisely.com/v3')
		.log(console.log);
}

function nockCollection(n, path, result) {
	return n.get(path).reply(200, { data: result })
}

function nockEventTeam() {
	nockCollection(nockRaisely(), /\/events\/.*\/rsvps/, [
		{ type: 'facilitator', user: facilitator },
		{ type: 'host', user: host },
	]);
	return { facilitator, host };
}

module.exports = {
	nockRaisely,
	nockEventTeam,
	nockCollection,
}
