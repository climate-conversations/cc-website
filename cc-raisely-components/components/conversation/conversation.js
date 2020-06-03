/**
 * Helper to load conversation and other records commonly associated
 * (eg host, facils, guests, surveys, etc)
 *
 * The methods here return an object containing the records requested and/or error
 * containing an exception
 * This way it's easy to handle errors as per the example below which will
 * either put a conversation on the state, or an exception in error
 * @example
 * this.setState(await Conversation.loadConversation(...))
 *
 * const { error, conversation } = this.state;
 * if (error) return <p>{error}</p>;
 * return <div>{conversation.name}</div>;
 */
(RaiselyComponents, React) => {
	const { api } = RaiselyComponents;
	const { getData, getQuery, qs, quickLoad } = api;
	const { get, set } = RaiselyComponents.Common;

	const websiteCampaignUuid = 'f2a3bc70-96d8-11e9-8a7b-47401a90ec39';

	const UserSaveHelperRef = RaiselyComponents.import('cc-user-save', { asRaw: true });
	let UserSaveHelper;

	const plural = word => ((word.slice(word.length - 1) === 's') ? word : `${word}s`);

	const reflectionCategory = 'facilitator-reflection';
	const surveyCategories = {
		preSurvey: 'cc-pre-survey-2020',
		postSurvey: 'cc-post-survey-2020',
	};

	async function loadModel({ props, required, private: isPrivate, model }) {
		try {
			let uuid = get(props, `match.params.${model}`);
			if ((model === 'event') && !uuid ) uuid = get(props, `match.params.conversation`);
			let url = `/${plural(model)}/${uuid}`;
			if (isPrivate) url += '?private=1';

			if (!UserSaveHelper) UserSaveHelper = UserSaveHelperRef().html;
			const conversation = await UserSaveHelper.proxy(url, {});
			console.log('model loaded',uuid, conversation)
			return conversation;
		} catch (e) {
			if (required) throw e;
			console.error(e);
			return { error: e.message, errorObject: e };
		}
	}

	return class Conversation extends React.Component {
		static getReflectionCategory() {
			return reflectionCategory;
		}
		static getUuid(props) {
			return props.conversation ||
				get(props, 'match.params.event') ||
				get(props, 'match.params.conversation') ||
				getQuery(get(props, 'router.location.search', {})).event;
		}

		static async loadReflections({ eventUuid, userUuid }) {
			const query = {
				reference: eventUuid,
				recordType: 'event',
				category: reflectionCategory,
				user: userUuid,
				private: 1,
			};

			const interactions = await getData(api.interactions.getAll({
				query,
			}));
			return interactions;
		}

		/**
		 * Load the surveys for a particular guest of a conversation
		 * @param {string} eventRsvp.eventUuid the conversation to load the surveys for
		 * @param {string} eventRsvp.userUuid The user to load the survey for
		 * @param {string[]} include Containig 'pre' or 'post' Default: both
		 * @returns {object} { pre, post }
		 */
		static async loadSurveys(eventRsvp, include = ['pre', 'post']) {
			const promises = ['pre', 'post'].map(key => {
				if (!include || include.includes(key)) {
					return getData(api.interactions.getAll({
						query: {
							private: 1,
							category: surveyCategories[`${key}Survey`],
							user: eventRsvp.userUuid,
						},
					}))
					.then(results => results.find(r => (r.recordUuid === eventRsvp.eventUuid)));
				}
				return null;
			});
			const [pre, post] = await Promise.all(promises);

			return { pre, post };
		}

		/**
		 * Load a conversation
		 * @param {object} opts.props Pass in this.props
		 * @param {boolean} opts.private Is the private event required?
		 * @return {object} The conversation that's loaded
		 */
		static async loadConversation(options) {
			return loadModel({ ...options, model: 'event' })
		}

		static async loadRsvp(options) {
			return loadModel({ ...options, model: 'eventRsvp' })
		}

		/**
		 * Fetches rsvps for the conversation and extracts particular types
		 * NOTE: Rsvps are rsvp records, while the extracted records are user records
		 *
		 * @param {object} opts.props Pass in this.props
		 * @param {string[]} opts.type Array of rsvp types to extract eg ['facilitator', 'guest']
		 * @returns {object} Containing all rsvps, plus split by type { rsvps, guests, facilitators, error }
		 * NOTE that keys in the returned object are always plural, but types should be singular
		 *
		 * @example
		 * const { props } = this;
		 * this.setState(await Conversation.loadRsvps({ props, ['facilitator', 'host'] }))
		 * const { rsvps, hosts, facilitators, error } = this.state;
		 */
		static async loadRsvps({ props, type }) {
			const result = {};
			try {
				const types = Array.isArray(type) ? type.map(t => plural(t)) : type;

				const eventUuid = props.eventUuid ||
					props.conversation ||
					get(props, 'match.params.event') ||
					get(props, 'match.params.conversation') ||
					getQuery(get(props, 'router.location.search')).event;

				if (!UserSaveHelper) UserSaveHelper = UserSaveHelperRef().html;
				result.rsvps = await UserSaveHelper.proxy('/event_rsvps', { query: { event: eventUuid, private: 1 } });
				if (types) types.forEach((key) => { result[key] = []; });
				result.rsvps.forEach((rsvp) => {
					// Work around an api bug
					if (rsvp.eventUuid === eventUuid) {
						const key = plural(rsvp.type);
						if (types && types.includes(key)) result[key].push(rsvp.user);
					}
				});
			} catch (e) {
				console.error(e);
				Object.assign(result, { error: e.message, errorObject: e });
			}
			return result;
		}

		/**
		 * Sum guests, donations, host and facil interests for the conversation
		 * and cache them on the event so they can be more easily retrieved
		 * @param {string} eventUuid the id of the event to fetch and update cache if need be
		 * @return {Event} with private.cache set
		 */
		static async updateStatCache(eventUuid) {
			const query = {
				category: surveyCategories.postSurvey,
				reference: eventUuid,
				recordType: 'event',
			};
			const queryStr = qs.stringify(query);
			if (!UserSaveHelper) UserSaveHelper = UserSaveHelperRef().html;
			const [event, results, donations, surveys] = await Promise.all([
				UserSaveHelper.proxy(`/events/${eventUuid}?private=1`),
				this.loadRsvps({ props: { eventUuid }, type: ['co-facilitator', 'facilitator', 'guest']}),
				UserSaveHelper.proxy(`/donations?campaign=${websiteCampaignUuid}&conversationUuid=${eventUuid}&private=1`),
				UserSaveHelper.proxy(`/interactions?${queryStr}`, { method: 'GET' }),
			]);
			const { rsvps } = results;

			const cache = {
				guests: 0,
				hosts: 0,
				facilitators: 0,
				donations: {
					online: 0,
					total: 0,
					donorCount: 0,
				},
			};
			rsvps.forEach(guest => {
				if (guest.type === 'guest') cache.guests++;
			});
			surveys.forEach(survey => {
				if (get(survey, 'detail.private.host')) cache.hosts += 1;
				if (get(survey, 'detail.private.facilitate')) cache.faciltiators += 1;
			});
			donations.forEach(donation => {
				cache.donations.total += donation.campaignAmount;
				cache.donations.donorCount += 1;
				if (donation.type === 'ONLINE') {
					cache.donations.online += donation.campaignAmount;
				} else {
					const paymentType = get(donation, 'public.paymentType');
					const init = get(cache.donations, paymentType, 0);
					set(cache.donations, paymentType, init + donation.campaignAmount);
				}
			});

			const oldCache = get(event, 'private.statCache', {});
			if (Object.keys(cache).find(key => cache[key] !== oldCache[key]) ||
				Object.keys(cache.donations).find(key => cache.donations[key] !== oldCache.donations[key])) {
				await UserSaveHelper.proxy(`/events/${event.uuid}`, {
					body: {
						data: { private: { statCache: cache } },
						partial: true,
					}
				});
				set(event, 'private.statCache', cache);
			}
			return event;
		}

		/**
		 * Give a conversation a name from the host
		 */
		static defaultName(rsvps) {
			if (!(rsvps && rsvps.length)) return null;
			const hostName = rsvps[0].fullName || rsvps[0].preferredName;
			return `${hostName}'s conversation`;
		}

		static surveyCategories() { return surveyCategories; }
		static isProcessed(conversation) { return get(conversation, 'private.isProcessed'); }
		static isReconciled(conversation) { return get(conversation, 'private.reconciledAt'); }
		static isReviewed(conversation) { return get(conversation, '!!private.reviewedAt'); }
		static awaitingReview(conversation) {
			return this.isProcessed(conversation) && !this.isReviewed(conversation);
		}
	};
};
