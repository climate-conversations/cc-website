process.env.NODE_ENV='test';

require('../config');

const nock = require('nock');
const chai = require('chai');
const chaiSubset = require('chai-subset');

chai.use(chaiSubset);

const facilitator = {
	uuid: 'facilitator-uuid',
	fullName: 'Test Facilitator',
	photoUrl: '/photo.jpg',
	email: 'facilitator@cc.test',
};
const host = {
	uuid: 'host-uuid',
	fullName: 'Test Host',
	photoUrl: '/host-photo.jpg',
	email: 'host@cc.test',
}

function nockRaisely() {
	return nock('https://api.raisely.com/v3')
		.log(console.log);
}

function nockCollection(n, path, result, token) {
	return n
		.get(path)
		.reply(function () {
			if (token) {
				const auth = this.req.headers.authorization;
				if (!auth) throw new Error('Expected authorization header')
				const [b, t] = auth.split(' ');
				if (t !== token) {
					throw new Error(`Token missing or incorrect: ${t} (expected ${token})`);
				}
			}
			return [200, { data: result }]
		})
}

function nockEventTeam() {
	nockCollection(nockRaisely(), /events\/.*\/rsvps/, [
		{ type: 'facilitator', user: facilitator },
		{ type: 'host', user: host },
	], process.env.RAISELY_TOKEN);
	return { facilitator, host };
}

module.exports = {
	nockRaisely,
	nockEventTeam,
	nockCollection,
}
