/* eslint-disable class-methods-use-this */
const { AirblastController } = require('airblast');
const _ = require('lodash');

const { getSpreadsheet, findOrCreateWorksheet, upsertRow } = require('../services/sheets');
const { isoToSgDateAndTime } = require('../helpers/dateHelpers');
const { getField, raiselyRequest, raiselyToRow } = require('../helpers/raiselyHelpers');
const { fetchTeam } = require('../helpers/raiselyConversationHelpers');

const options = {
	wrapInData: true,
};

const userFields = ['fullName', 'preferredName', 'phoneNumber', 'email', 'postcode'];

/**
 * Returns a map from qualified id to spreadsheet header label
 * with special cases:
 * * Ids starting with conversation., host. or facilitator. are
 *   converted in full (eg Facilitator Name)
 * * Ids starting with user. omit user. (eg Full Name)
 * * Ids that appear in both pre and post surveys are appended with Before or After
 * @param {string[]} headers ids of the headers
 * @returns {object} map from id to header
 */
function idToHeaders(headers) {
	// List of field ids for pre and post
	const [pre, post] = ['preSurvey', 'postSurvey'].map(prefix => headers
		.filter(id => id.startsWith(`${prefix}.`))
		.map(id => id.split('.')[1]));
	const overlap = pre.filter(id => post.includes(id));

	const keepPrefix = ['conversation', 'host', 'facilitator'];
	const tenseMap = {
		preSurvey: 'before',
		postSurvey: 'after',
	};

	const idMap = {};
	headers.forEach(id => {
		const [prefix, key] = id.split('.');
		if (keepPrefix.includes(prefix)) {
			idMap[id] = _.startCase(id);
		} else if (['preSurvey', 'postSurvey'].includes(prefix) && overlap.includes(key)) {
			const tense = tenseMap[prefix];
			idMap[id] = _.startCase(`${key} ${tense}`);
		} else {
			idMap[id] = _.startCase(key);
		}
	});
	idMap['rsvp.uuid'] = 'GuestId';

	return idMap;
}

function selectFields(data, { facilitator, host }) {
	const { user, preSurvey, postSurvey, conversation, rsvp } = data;

	const { date, time } = isoToSgDateAndTime(conversation.startAt);
	let donationAmount = getField({ rsvp }, 'rsvp.donationAmount');
	if (donationAmount) donationAmount = donationAmount / 100

	return {
		user: _.pick(user, userFields),
		conversation: { uuid: conversation.uuid, name: conversation.name, date, time },
		rsvp: {
			donationIntention: getField({ rsvp }, 'rsvp.donationIntention'),
			donationAmount,
			uuid: rsvp.uuid,
		},
		facilitator,
		host,
		preSurvey,
		postSurvey,
	};
}

class BackendReport extends AirblastController {
	async process({ data }) {
		if (data.type !== 'guest.created') throw new Error(`Unrecognised event ${data.type}`);

		const surveyVersion = '2020';
		const sheetTitle = `Surveys ${surveyVersion}`;
		const { BACKEND_SPREADSHEET } = process.env;

		const guestData = data.data;
		const { rsvp, conversation } = guestData;
		if (!rsvp || !rsvp.uuid) throw new Error(`Cannot add to sheet as guest info has no ${rsvp.uuid}`);

		// Prepare spreadsheet headers
		const [headerInfo, team] = await Promise.all([
			this.getHeaders(surveyVersion),
			fetchTeam(conversation.uuid),
		]);
		const { headers, headerMap } = headerInfo;

const document = await getSpreadsheet(BACKEND_SPREADSHEET);

		// Find tab in spreadsheet that matches 'Surveys 2020'
		const { sheet } = await findOrCreateWorksheet(document, sheetTitle, headers);

		const preparedData = selectFields(guestData, team);
		const row = raiselyToRow(preparedData, headerMap);

		// Create row
		await upsertRow(sheet, `guestid = ${rsvp.uuid}`, row);
	}

	async getHeaders(surveyVersion) {
		// Cache the headers so we don't fetch them multiple times
		if (!this.headerMap) {
			if (!this.surveyPromise) {
				this.surveyPromise = this.getSurveyFields(surveyVersion);
			}
			const { preSurveyFields, postSurveyFields } = await this.surveyPromise;
			const fieldIds = this.getOrderedFields({ preSurveyFields, postSurveyFields });
			this.headerMap = idToHeaders(fieldIds);
			this.headers = fieldIds.map(id => this.headerMap[id]);
		}
		const { headers, headerMap } = this;
		return { headers, headerMap };
	}

	async getSurveyFields(surveyVersion) {
		const config = await raiselyRequest({
			path: '/campaigns/cc-volunteer-portal/config',
		});

		let preSurveyFields = config.interactionCategoryFields[`cc-pre-survey-${surveyVersion}`];
		let postSurveyFields = config.interactionCategoryFields[`cc-post-survey-${surveyVersion}`];
		if (!preSurveyFields) throw new Error(`Cannot find interaction fields for cc-pre-survey-${surveyVersion}`);
		if (!postSurveyFields) throw new Error(`Cannot find interaction fields for cc-post-survey-${surveyVersion}`);

		// Map so the field names have prefixes
		preSurveyFields = preSurveyFields.map(f => `preSurvey.${f}`);
		postSurveyFields = postSurveyFields.map(f => `postSurvey.${f}`);

		return { preSurveyFields, postSurveyFields };
	}

	getOrderedFields({ preSurveyFields, postSurveyFields }) {
		const headers = [
			'rsvp.uuid',
			'user.fullName',
			'conversation.name',
			'conversation.date',
			'conversation.time',
			'conversation.uuid',
			'user.preferredName',
			'user.email',
			'user.phoneNumber',
			'host.fullName',
			'host.email',
			'facilitator.fullName',
			'facilitator.email',
			...preSurveyFields,
			...postSurveyFields,
			'rsvp.donationIntention',
			'rsvp.donationAmount',
		];

		return headers;
	}
}

BackendReport.options = options;

module.exports = BackendReport;
