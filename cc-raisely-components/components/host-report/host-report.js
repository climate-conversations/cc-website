/* eslint-disable no-use-before-define */
(RaiselyComponents, React) => {
	const { get } = RaiselyComponents.Common;
	const { api, Spinner } = RaiselyComponents;
	const { getQuery, getData, quickLoad } = api;

	const Messenger = RaiselyComponents.import('message-send-and-save');
	const ReturnButton = RaiselyComponents.import('return-button');
	const ConversationRef = RaiselyComponents.import('conversation', { asRaw: true });
	let Conversation;

	const HIGH_LEVEL = 8;

	const attitudeConditions = [{
		label: 'now are more likely to talk about climate breakdown',
		fn: ({ pre, post }) => increased(pre, post, 'talkativeness'),
	}, {
		label: 'view climate breakdown as a higher priority',
		sublabel: '(than they did before the conversation)',
		fn: ({ pre, post }) => increased(pre, post, 'priority'),
	}, {
		label: 'now view climate breakdown as the highest priority',
		sublabel: "(and they didn't before)",
		fn: ({ pre, post }) => crossed(pre, post, 'priority', HIGH_LEVEL),
	}, {
		label: 'feel a greater sense of agency to act on climate breakdown',
		fn: ({ pre, post }) => increased(pre, post, 'agency'),
	}, {
		label: 'feels highly empowered',
		fn: ({ pre, post }) => crossed(pre, post, 'agency', HIGH_LEVEL),
	}, {
		label: 'people would highly recommend Climate Conversations',
		fn: ({ post }) => get(post, 'private.recommend') >= HIGH_LEVEL,
	}];

	/**
	 * Helper for counting how many objects match a criteria
	 * @param {object[]} array Array of objects to match
	 * @param {*} field Field to pass into fn (if null, will pass in the whole object)
	 * @param {*} fn All records for which fn returns true will be counted,
	 * If no function is specified, will count all objects for which field is truthy
	 */
	function countIf(array, field, fn) {
		// eslint-disable-next-line no-param-reassign
		if (!fn) fn = value => value;

		return array.reduce((total, current) =>
			(fn(field ? get(current, ['private', field]) : current) ? total + 1 : total), 0);
	}

	/**
	 * Returns true if a field has increased between pre and post survey
	 */
	function increased(pre, post, field) {
		// Don't false positive if field is missing
		if (get(pre, ['private', field], 'MISSING') === 'MISSING') return false;

		const before = get(pre, ['private', field], 'MISSING');
		const after = get(post, ['private', field], 0);

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
		// Don't false positive if field is missing
		if (get(pre, ['private', field], 'MISSING') === 'MISSING') return false;

		const before = get(pre, ['private', field], 'MISSING');
		const after = get(post, ['private', field], 0);

		return (before < threshold) && (after >= threshold);
	}

	return class HostReport extends React.Component {
		state = { loading: true }
		componentDidMount() {
			this.load();
		}

		async load() {
			try {
				if (!Conversation) Conversation = ConversationRef().html;

				const eventUuid = this.props.conversation ||
					get(this.props, 'match.params.event') ||
					getQuery(get(this.props, 'router.location.search')).event;

				const eventPromise = Conversation.loadConversation({ props: this.props })
					.then(r => this.setState(r));
				const rsvpPromise = Conversation.loadRsvps({ props: this.props, type: ['host', 'guest'] })
					.then(r => this.setState(r));

				const promises = ['cc-pre-survey-2019', 'cc-post-survey-2019'].map(category =>
					getData(api.interactions.getAll({
						query: category,
						recordUuid: eventUuid,
					})));
				promises.push(eventPromise, rsvpPromise);

				const [preSurveys, postSurveys] = await Promise.all(promises);

				const state = { postSurveys, preSurveys };
				this.setState(state, () => {
					this.calculateActions();
					this.calculateAttitudes();
					this.setState({ loading: false });
				});
			} catch (e) {
				console.error(e);
				this.setState({ error: e.message });
			}
		}

		/**
		 * Summarise actions taken at a conversation
		 * @param {} postSurveys
		 * @param {*} rsvps
		 */
		calculateActions() {
			const { postSurveys, rsvps } = this.state;
			const actions = ['host', 'facilitate', 'volunteer'].map(field =>
				({
					label: `${field}s`,
					value: countIf(postSurveys, field),
				}));

			// Count all donation intentions that are present and not 'no'
			actions.push({
				label: 'donations',
				value: countIf(rsvps, 'donationIntention', value => value && value !== 'no'),
			});

			this.setState({ actions });
		}

		/**
		 * Summarise the attitude shifts of the guests
		 * @param {object[]} preSurveys
		 * @param {object[]} postSurveys
		 */
		// eslint-disable-next-line class-methods-use-this
		calculateAttitudes() {
			const { postSurveys, preSurveys } = this.state;

			// Match pre with post
			const matchedSurveys = postSurveys.map(survey => ({
				pre: preSurveys.find(s => s.userUuid === survey.uuid),
				post: survey,
			}));

			const attitudes = attitudeConditions.map(attitude => (
				{
					label: attitude.label,
					sublabel: attitude.sublabel,
					value: countIf(matchedSurveys, null, attitude.fn),
				}));

			this.setState({ attitudes });
		}

		renderSendReport = () => {
			const { hosts } = this.state;
			const defaultMessage = 'Thank you for hosting a Climate Conversation. Attached is a summary of the impact you enabled';
			const path = get(this.props, 'location.pathname');
			const url = `https://p.climate.sg/${path}`;
			let body = get(this.props, 'global.campaign.public.conversationHostThankyou', defaultMessage);
			body = `${body}
${url}`;

			return (
				<Messenger
					{...this.props}
					to={hosts}
					subject="Thank you for hosting a Climate Conversation"
					body={body}
					launchButtonLabel="Send Report to Host"
				/>
			);
		}

		render() {
			let actions;
			let attitudes;

			const { props } = this;
			const { error, loading, conversation } = this.state;

			if (!loading) {
				// Only show actions/attitudes that have at least 1 person
				actions = this.state.actions
					.filter(a => a.value);
				attitudes = this.state.attitudes
					.filter(a => a.value);
			}

			actions = [
				{ label: 'hosts', value: 2 },
				{ label: 'facilitators', value: 2 },
				{ label: 'donors', value: 3 },
			];
			attitudes = attitudeConditions.map((a, i) => { a.value = i % 3 + 1; return a; });

			if (error) {
				return <div className="error">Could not load host report: ${error}</div>;
			}

			const name = get(conversation, 'name', '');

			return (
				<div className="host--report__wrapper">
					<div className="host--report__header">
						<div className="host--report__header">{name}</div>
						<h3 className="">Thank you for hosting a Climate Conversation</h3>
					</div>
					<div className="host--report__action">
						<div className="">Your conversation has inspired the following actions...</div>
						{actions ? actions.map(action => (
							<div className="host--report__action-item">
								<div className="host--report__action-item-number">{action.value}</div>
								<div className="host--report__action-item-label">{action.label}</div>
							</div>
						)) : <Spinner /> }
					</div>
					<div className="host--report__attitudes">
						<div className="">As a result of your conversation ...</div>
						{attitudes ? attitudes.map(attitude => (
							<div className="host--report__attitude-item">
								<div className="host--report__attitude-item-number">{attitude.value}</div>
								<div className="host--report__attitude-item-label">
									{attitude.value === 1 ? 'person' : 'people' } {attitude.label}
									<div className="host--report__attitude-item-sublabel">
										{attitude.sublabel}
									</div>
								</div>
							</div>
						)) : <Spinner /> }
					</div>
					<div className="host--report__buttons">
						<ReturnButton {...props} backTheme="secondary" backLabel="Go back" />
						{this.renderSendReport()}
					</div>
				</div>
			);
		}
	};
};
