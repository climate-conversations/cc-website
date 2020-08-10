const qs = require('qs');
const raiselyRequest = require('./raiselyRequest')
const { get } = require('lodash');

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

const HIGH_LEVEL = 8;

async function getData(promise) {
	const result = await promise;
	return result.data;
}

const attitudeConditions = [
	{
		id: "increased-talkativeness",
		fn: ({ pre, post }) => increased(pre, post, "talkativeness")
	},
	{
		id: "increased-priority",
		fn: ({ pre, post }) => increased(pre, post, "priority")
	},
	{
		id: "high-priority",
		fn: ({ pre, post }) => crossed(pre, post, "priority", HIGH_LEVEL)
	},
	{
		id: "increased-hope",
		fn: ({ pre, post }) => increased(pre, post, "hope")
	},
	{
		id: "increased-agency",
		fn: ({ pre, post }) => increased(pre, post, "agency")
	},
	{
		id: "high-agency",
		fn: ({ pre, post }) => crossed(pre, post, "agency", HIGH_LEVEL)
	},
	{
		id: "highly-recomends",
		fn: ({ post }) => get(post, "detail.private.recommend") >= HIGH_LEVEL
	}
];

/**
 * Helper for counting how many objects match a criteria
 * @param {object[]} array Array of objects to match
 * @param {*} field Field to pass into fn (if null, will pass in the whole object)
 * @param {*} fn All records for which fn returns true will be counted,
 * If no function is specified, will count all objects for which field is truthy
 */
function countIf(array, field, fn, fieldPath = ['detail', 'private']) {
	// eslint-disable-next-line no-param-reassign
	if (!fn) fn = value => value;
	const path = [...fieldPath, field]

	return array.reduce(
		(total, current) =>
			fn(field ? get(current, path) : current) ? total + 1 : total,
		0
	);
}

/**
 * Returns true if a field has increased between pre and post survey
 */
function increased(pre, post, field) {
	const before = get(pre, ['detail', 'private', field], 'MISSING');
	const after = get(post, ['detail', 'private', field], 0);

	// Don't false positive if field is missing
	if (before === 'MISSING') return false;

	return before < after;
}

/**
 * Returns true if a participant survey score became >= threshold since pre survey
 * @param {object} pre pre-survey interaction
 * @param {object} post post-survey interaction
 * @param {*} field name of the private field to check
 * @param {*} threshold value that needs to be crossed
 */
function crossed(pre, post, field, threshold) {

	const before = get(pre, ['detail', 'private', field], 'MISSING');
	const after = get(post, ['detail', 'private', field], 0);

	// Don't false positive if field is missing
	if (before === 'MISSING') return false;

	return (before < threshold) && (after >= threshold);
}

async function hostReport(req) {
	// Conversation.surveyCategories().preSurvey,
	// Conversation.surveyCategories().postSurvey,
	const query = getQuery(req.originalUrl);

	const defaultSurveys = ['cc-pre-survey-2020', 'cc-post-survey-2020'];
	const preSurveyCategory = query.pre || defaultSurveys[0];
	const postSurveyCategory = query.post || defaultSurveys[1];
	const surveys = [preSurveyCategory, postSurveyCategory];

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

	let rsvps;
	const rsvpPromise = getData(raiselyRequest(
		{
			method: "GET",
			path: `/events/${eventUuid}/rsvps`,
			query: { private: 1 },
			escalate: true,
			cacheKey: `/events/${eventUuid}/rsvps`
		},
		req
	)).then(result => {
		rsvps = sortRsvps(result, ["guests"]);
	});

	const promises = surveys.map(category =>
		getData(raiselyRequest({
			method: 'GET',
			path: `/interactions`,
			query: { category, private: 1, reference: eventUuid },
			escalate: true,
			cacheKey: `/interactions/${eventUuid}/${category}`,
		}, req)));

	promises.push(eventPromise, rsvpPromise);

	const [preSurveys, postSurveys, event] = await Promise.all(promises);

	const actions = calculateActions({ postSurveys, rsvps: rsvps.guests });
	const attitudes = calculateAttitudes({ preSurveys, postSurveys });

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
	const result = {};
	if (types) types.forEach((key) => { result[key] = []; });
	rsvps.forEach((rsvp) => {
		// Work around an api bug
		const key = `${rsvp.type}s`;
		if (types && types.includes(key)) result[key].push(rsvp);
	});
	return result;
}

/**
 * Summarise actions taken at a conversation
 * @param {} postSurveys
 * @param {*} rsvps
 */
function calculateActions( { postSurveys, rsvps }) {
	const actions = ['host', 'facilitate', 'volunteer'].map(field =>
		({
			label: field === 'facilitate' ? 'facilitators' : `${field}s`,
			value: countIf(postSurveys, field),
		}));

	// Count all donation intentions that are present and not 'no'
	actions.push({
		label: 'donations',
		value: countIf(rsvps, 'donationIntention', value => value && value !== 'no', ['private']),
	});

	return actions;
}

/**
 * Summarise the attitude shifts of the guests
 * @param {object[]} preSurveys
 * @param {object[]} postSurveys
 */
// eslint-disable-next-line class-methods-use-this
function calculateAttitudes({ postSurveys, preSurveys }) {
	// Match pre with post
	const matchedSurveys = postSurveys.map(survey => ({
		pre: preSurveys.find(s => s.userUuid === survey.userUuid),
		post: survey,
	}));

	const attitudes = attitudeConditions.map(attitude => {
		const calculatedAttribute = {
			id: attitude.id,
			label: attitude.label,
			sublabel: attitude.sublabel,
			value: countIf(matchedSurveys, null, attitude.fn),
		};
		if (attitude.plural && calculatedAttribute.value !== 1) {
			calculatedAttribute.label = attitude.plural;
		}
		return calculatedAttribute;
	});

	return attitudes;
}

module.exports = {
	hostReport,
};
