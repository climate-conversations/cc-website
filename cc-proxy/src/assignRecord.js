const RestError = require('./restError');
const { authorize } = require('./proxy/permissions');
const raisely = require('./raiselyRequest');

async function assignRecord(req, recordUuid, assignee, recordType = 'user') {
	if (!assignee) assignee = escalation.originalUser.uuid;
	const escalation = await authorize(req, '/assignments');
	if (!escalation) {
		throw new RestError({
			status: 403,
			message: 'Unauthorized',
			code: 'unauthorized',
		});
	}
	return raisely({
		method: 'POST',
		path: `/users/${assignee}/assignments`,
		body: {
			data: [{
				recordUuid,
				recordType,
			}],
		},
		escalate: true,
	}, req);
}

module.exports = assignRecord;
