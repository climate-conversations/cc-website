const RestError = require('./restError');
const { authorize, getTagsAndRoles } = require('./proxy/permissions');
const raisely = require('./raiselyRequest');

async function mergeConversations(req) {
	console.log(req.body);
	let { conversationUuid1, conversationUuid2 } = req.body.data;
	console.log(conversationUuid1);

	let data = await raisely(
		{
			method: 'GET',
			path: `/events/${conversationUuid1}`,
			query: { private: 1 },
			escalate: true,
		},
		req
	);
	return {
		data: 'data',
	};
}

module.exports = { mergeConversations };
