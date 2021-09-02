const RestError = require('./restError');
const { authorize, getTagsAndRoles } = require('./proxy/permissions');
const raisely = require('./raiselyRequest');

/**
 * Assign a record to a user. Will authorize agains /assignments and
 * will escalate if the calling user is not a team-leader
 *
 * @param {*} req
 * @param {*} recordUuid The record to assign
 * @param {*} assigneeUuid The user to assign to
 * @param {*} recordType The type of record
 */
async function assignRecord(
	req,
	recordUuid,
	assigneeUuid,
	recordType = 'user'
) {
	console.log('assignRecord function is called');

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
	return raisely(
		{
			method: 'POST',
			path: `/users/${assigneeUuid}/assignments`,
			body: {
				data: [
					{
						recordUuid,
						recordType,
					},
				],
			},
			escalate: mustEscalate,
		},
		req
	);
}

/**
 * Check if the user has is already assigned to the record (or is a team-leader)
 * and reassigns the record as requested if they are
 *
 * @param {object} req
 * @param {object} req.body.data
 * @param {object} req.body.data.userUuid UUID of the user
 * @param {object} req.body.data.type 'facilitator' or 'team-leader'
 * @param {object} req.body.data.parentUuid UUID of the parent profile (team to join)
 * @param {object} req.body.data.name Name of the profile to create
 */
async function assignRecordRequest(req) {
	const { roles, user: originalUser } = await getTagsAndRoles(req);
	const canAssign = ['DATA_ADMIN', 'ORG_ADMIN'];
	const escalationNeeded = !canAssign.reduce(
		(can, role) => can || roles.includes(role),
		false
	);

	// console.log(req);
	const { recordUuid, userUuid, recordType, isSelfAssign } = req.body.data;
	console.log(req.body.data);

	if (!originalUser) {
		console.log('this is thrown');
		throw new RestError({ status: 403 });
	}

	// If they're not a data/org admin, only allow them to reassign records they own
	// if (escalationNeeded && !isSelfAssign) {
	// 	try {
	// 		const path = `/users/${originalUser.uuid}/assignments/${recordType}s/${recordUuid}`;
	// 		console.log('path:', path);
	// 		await raisely(
	// 			{
	// 				method: 'GET',
	// 				path,
	// 			},
	// 			req
	// 		);
	// 	} catch (error) {
	// 		const status = error.status || error.statusCode;
	// 		// Asignment could not be found, therefore unauthorized
	// 		if (status === 404) {
	// 			console.log('error is thrown here');
	// 			throw new RestError({
	// 				status: 403,
	// 				message: 'Unauthorized',
	// 			});
	// 		}
	// 		throw error;
	// 	}
	// }

	return assignRecord(req, recordUuid, userUuid, recordType);
}

module.exports = { assignRecord, assignRecordRequest };
