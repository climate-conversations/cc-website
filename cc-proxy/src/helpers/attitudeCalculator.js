const { get } = require("lodash");

const HIGH_LEVEL = 8;

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
 * Summarise actions taken at a conversation
 * @param {} postSurveys
 * @param {*} rsvps
 */
function calculateActions({ postSurveys, rsvps, actionIds }) {
	const actionList = actionIds || ["host", "facilitate", "volunteer"];

	const actions = actionList.map(field => ({
		label: field === "facilitate" ? "facilitators" : `${field}s`,
		value: countIf(postSurveys, field)
	}));

	// Count all donation intentions that are present and not 'no'
	actions.push({
		label: "donations",
		value: countIf(
			rsvps,
			"donationIntention",
			value => value && value !== "no",
			["private"]
		)
	});

	return actions;
}

/**
 * Summarise the attitude shifts of the guests
 * @param {object[]} preSurveys
 * @param {object[]} postSurveys
 */
// eslint-disable-next-line class-methods-use-this
function calculateAttitudes({ postSurveys, preSurveys, attitudeIds }) {
	// Match pre with post
	const matchedSurveys = postSurveys.map(survey => ({
		pre: preSurveys.find(s => s.userUuid === survey.userUuid),
		post: survey
	}));

	let attitudeList = attitudeConditions;;

	if (attitudeIds) {
		attitudeList = attiudeConditions.filter(a => attitudeIds.includes(a.id));
	}

	const attitudes = attitudeConditions.map(attitude => {
		const calculatedAttribute = {
			id: attitude.id,
			label: attitude.label,
			sublabel: attitude.sublabel,
			value: countIf(matchedSurveys, null, attitude.fn)
		};
		if (attitude.plural && calculatedAttribute.value !== 1) {
			calculatedAttribute.label = attitude.plural;
		}
		return calculatedAttribute;
	});

	return attitudes;
}

module.exports = {
	calculateAttitudes,
	calculateActions,
}
