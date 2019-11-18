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
	const { getData, getQuery, quickLoad } = api;
	const { get } = RaiselyComponents.Common;

	const plural = word => ((word.slice(word.length - 1) === 's') ? word : `${word}s`);

	return class Conversation extends React.Component {
		static getUuid(props) {
			return props.conversation ||
				get(props, 'match.params.event') ||
				getQuery(get(props, 'router.location.search', {})).event;
		}

		/**
		 * Load a conversation
		 * @param {object} opts.props Pass in this.props
		 * @param {boolean} opts.private Is the private event required?
		 * @return {object} Suitable for using with this.setState
		 */
		static async loadConversation({ props, private: isPrivate }) {
			try {
				const models = [`event${isPrivate ? '.private' : ''}`];
				const { event: conversation } = await quickLoad({ models, required: true, props });
				return conversation;
			} catch (e) {
				console.error(e);
				return { error: e.message, errorObject: e };
			}
		}

		/**
		 * Fetches rsvps for the conversation and extracts particular types
		 * NOTE: Rsvps are rsvp records, while the extracted records are user records
		 *
		 * @param {object} opts.props Pass in this.props
		 * @param {string[]} opts.type Array of rsvp types to extract
		 *
		 * @example
		 * const { props } = this;
		 * this.setState(await Conversation.loadRsvps({ props, ['facilitator', 'host'] }))
		 * const { rsvps, hosts, facilitators, error } = this.state;
		 */
		static async loadRsvps({ props, type }) {
			const result = {};
			try {
				const types = type.map(t => plural(t));

				const eventUuid = props.conversation ||
					get(props, 'match.params.event') ||
					getQuery(get(props, 'router.location.search')).event;

				result.rsvps = await getData(api.eventRsvps.getAll({ query: { event: eventUuid, private: 1 } }));
				types.forEach((key) => { result[key] = []; });
				result.rsvps.forEach((rsvp) => {
					// Work around an api bug
					if (rsvp.eventUuid === eventUuid) {
						const key = plural(rsvp.type);
						if (types.includes(key)) result[key].push(rsvp.user);
					}
				});
			} catch (e) {
				console.error(e);
				Object.assign(result, { error: e.message, errorObject: e });
			}
			return result;
		}

		static isProcessed(conversation) { return get(conversation, 'private.isProcessed'); }
		static isReviewed(conversation) { return get(conversation, '!!private.reviewedAt'); }
		static awaitingReview(conversation) {
			return this.isProcessed(conversation) && !this.isReviewed(conversation);
		}
	};
};
