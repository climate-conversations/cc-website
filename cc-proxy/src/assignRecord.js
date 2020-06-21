const RestError = require('./restError');
const { authorize } = require('./proxy/permissions');
const raisely = require('./raiselyRequest');

async function assignRecord(req, recordUuid, assigneeUuid, recordType = 'user') {
	if (!assigneeUuid) {
		throw new RestError({
			message: 'Unknown assignee',
			status: 400,
		});
	}
	const escalation = await authorize(req, '/assignments');
	if (!escalation) {
		throw new RestError({
			status: 403,
			message: 'Unauthorized',
			code: 'unauthorized',
		});
	}
	const mustEscalate = !escalation.originalUser.roles.includes('team-leader');
	return raisely({
		method: 'POST',
		path: `/users/${assigneeUuid}/assignments`,
		body: {
			data: [{
				recordUuid,
				recordType,
			}],
		},
		escalate: mustEscalate,
	}, req);
}

module.exports = assignRecord;
