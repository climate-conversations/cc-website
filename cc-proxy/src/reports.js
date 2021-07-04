const _ = require('lodash');
const qs = require('qs');
const raiselyRequest = require('./raiselyRequest');
const { calculateActions, calculateAttitudes } = require('./helpers/attitudeCalculator');

function parsePath(url) {
	const split = url.indexOf('?');
	const path = split === -1 ? url : url.slice(0, split);
	const query = split === -1 ? '' : url.slice(split + 1, url.length);

	return { path, query };
}

function getQuery(url) {
	const { path, query } = parsePath(url);
	return qs.parse(query);
}

async function getData(promise) {
	const result = await promise;
	return result.data;
}

/**
 * Count the number of attenees, defined as hosts, co-hosts and guests
 * removes duplicates (eg if someone were a host of one conversation
 * and then a guest)
 * @param {*} rsvps
 * @returns {integer}
 */
function countAttendees(rsvps) {
	const attendeeTypes = ['host', 'co-host', 'guest'];
	const allAttendees = rsvps
		.filter(r => attendeeTypes.includes(r.type))
		.map(r => r.userUuid);
	const uniqueAttendees = _.uniq(allAttendees);
	return uniqueAttendees.length;
}

async function loadReport(req, eventUuids, query) {
	const defaultSurveys = ["cc-pre-survey-2020", "cc-post-survey-2020"];
	const preSurveyCategory = query.pre || defaultSurveys[0];
	const postSurveyCategory = query.post || defaultSurveys[1];
	const surveyCategories = [postSurveyCategory, preSurveyCategory];

	let attendees;

	let rsvps;
	const rsvpPromise = getData(
		raiselyRequest(
			{
				method: "GET",
				path: `/event_rsvps`,
				query: { private: 1, event: eventUuids.join(',') },
				escalate: true,
				cacheKey: `/event_rsvps`
			},
			req
		)
	).then(result => {
		rsvps = sortRsvps(result, ["guests"]);
		attendees = countAttendees(rsvps.all);
	});

	const promises = surveyCategories.map(category =>
		getData(
			raiselyRequest(
				{
					method: "GET",
					path: `/interactions`,
					query: {
						category,
						private: 1,
						referenceIn: JSON.stringify(eventUuids),
					},
					escalate: true,
					cacheKey: `/interactions/${eventUuids.join(',')}/${category}`
				},
				req
			)
		)
	);

	promises.push(rsvpPromise);

	const [postSurveys, preSurveys] = await Promise.all(promises);

	const actions = calculateActions({ postSurveys, rsvps: rsvps.guests });
	const attitudes = calculateAttitudes({ preSurveys, postSurveys });

	return { attitudes, actions, attendees };
}

/**
 * Generate stats for a facilitator report
 * Currently returns increased talkativeness and attendees
 * @param {*} req
 */
async function facilReport(req) {
	const query = getQuery(req.originalUrl);

	const [path] = req.originalUrl.split("?");

	const facilUuid = path.split("/")[1];

	const facilTypes = ['facilitator', 'co-facilitator'];
	const [facilRsvps, coRsvps] = await Promise.all(facilTypes.map(facilType => getData(
		raiselyRequest(
			{
				method: "GET",
				path: `/event_rsvps`,
				query: { private: 1, user: facilUuid, type: facilType },
				escalate: true,
				cacheKey: `/event_rsvps?user=${facilUuid}&type=${facilType}`,
			},
			req
		)
	)));

	const eventUuids = facilRsvps.concat(coRsvps).map(r => r.eventUuid);
	const data = await loadReport(req, eventUuids, query);

	return { data };
}

/**
 * Generate stats for a host report
 * Currently returns increased talkativeness and attendees
 * @param {*} req
 */
async function hostReport(req) {
	const query = getQuery(req.originalUrl);

	const [path] = req.originalUrl.split('?');

	const eventUuid = path.split('/')[1];

	const eventPromise = getData(raiselyRequest(
		{
			method: "GET",
			path: `/events/${eventUuid}`,
			query: { private: 1 },
			escalate: true,
			cacheKey: `/events/${eventUuid}`,
		},
		req
	));

	const { actions, attitudes } = await loadReport(req, [eventUuid], query);
	const event = await eventPromise;

	return {
		data: {
			actions,
			attitudes,
			startAt: event.startAt,
		},
	}
}

/**
 * Split the rsvps into the given types
 * @param {object[]} rsvps
 * @param {string[]} types
 * @returns {object}
 * @example
 * const result = sortRsvps(rsvps, ['guests'])
 * // result.guests = [{ }, ...]
 */
function sortRsvps(rsvps, types) {
	const result = { all: rsvps };
	if (types) types.forEach((key) => { result[key] = []; });
	rsvps.forEach((rsvp) => {
		// Work around an api bug
		const key = `${rsvp.type}s`;
		if (types && types.includes(key)) result[key].push(rsvp);
	});
	return result;
}

module.exports = {
	hostReport,
	facilReport,
};
