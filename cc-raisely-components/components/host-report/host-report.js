/* eslint-disable no-use-before-define */
(RaiselyComponents, React) => {
	const { get } = RaiselyComponents.Common;
	const { api, Spinner } = RaiselyComponents;
	const { getQuery, getData } = api;

	const Messenger = RaiselyComponents.import('message-send-and-save');
	const ReturnButton = RaiselyComponents.import('return-button');
	const ConversationRef = RaiselyComponents.import('conversation', { asRaw: true });
	let Conversation;

	const HIGH_LEVEL = 8;

	const attitudeConditions = [{
		label: 'now is more likely to talk about climate breakdown',
		plural: 'now are more likely to talk about climate breakdown',
		fn: ({ pre, post }) => increased(pre, post, 'talkativeness'),
	}, {
		label: 'views climate breakdown as a higher priority',
		plural: 'view climate breakdown as a higher priority',
		sublabel: '(than they did before the conversation)',
		fn: ({ pre, post }) => increased(pre, post, 'priority'),
	}, {
		label: 'now views climate breakdown as the highest priority',
		plural: 'now view climate breakdown as the highest priority',
		sublabel: "(and they didn't before)",
		fn: ({ pre, post }) => crossed(pre, post, 'priority', HIGH_LEVEL),
	}, {
		label: 'feels more hopeful about our ability to act on climate breakdown',
		plural: 'feel more hopeful about our ability to act on climate breakdown',
		fn: ({ pre, post }) => increased(pre, post, 'hope'),
	}, {
		label: 'feels a greater sense of agency to act on climate breakdown',
		plural: 'feel a greater sense of agency to act on climate breakdown',
		fn: ({ pre, post }) => increased(pre, post, 'agency'),
	}, {
		label: 'feels highly empowered',
		plural: 'feel highly empowered',
		fn: ({ pre, post }) => crossed(pre, post, 'agency', HIGH_LEVEL),
	}, {
		label: 'would highly recommend Climate Conversations',
		fn: ({ post }) => get(post, 'detail.private.recommend') >= HIGH_LEVEL,
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
			(fn(field ? get(current, ['detail', 'private', field]) : current) ? total + 1 : total), 0);
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

	return class HostReport extends React.Component {
		state = { loading: true }
		componentDidMount() {
			this.load();
		}
		componentDidUpdate() {
			const eventUuid = get(this.props, 'match.params.event');
			// Reload the conversation and guests if the id has changed
			if (this.state.eventUuid !== eventUuid) {
				this.setState({ loading: true });
				this.load();
			}
		}

		async load() {
			try {
				if (!Conversation) Conversation = ConversationRef().html;
				const surveys = [
					Conversation.surveyCategories().preSurvey,
					Conversation.surveyCategories().postSurvey,
				];

				const eventUuid = this.props.conversation ||
					get(this.props, 'match.params.event') ||
					getQuery(get(this.props, 'router.location.search')).event;
				this.setState({ eventUuid });

				const eventPromise = Conversation.loadConversation({ props: this.props })
					.then(r => this.setState(r));
				const rsvpPromise = Conversation.loadRsvps({ props: this.props, type: ['host', 'guest'] })
					.then(r => this.setState(r));

				const promises = surveys.map(category =>
					getData(api.interactions.getAll({
						query: { category, private: 1, reference: eventUuid },
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
					label: field === 'facilitate' ? 'facilitators' : `${field}s`,
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
				pre: preSurveys.find(s => s.userUuid === survey.userUuid),
				post: survey,
			}));

			const attitudes = attitudeConditions.map(attitude => {
				const calculatedAttribute = {
					label: attitude.label,
					sublabel: attitude.sublabel,
					value: countIf(matchedSurveys, null, attitude.fn),
				};
				if (attitude.plural && calculatedAttribute.value !== 1) {
					calculatedAttribute.label = attitude.plural;
				}
				return calculatedAttribute;
			});

			this.setState({ attitudes });
		}

		onSendReport = () => {
			this.setState({ hasSent: true });
		}

		renderSendReport = () => {
			const { hosts } = this.state;
			const defaultMessage = 'Thank you for hosting a Climate Conversation. Attached is a summary of the impact you enabled';
			const path = get(this.props, 'location.pathname');
			const url = `https://p.climate.sg/${path}`;
			let body = get(this.props, 'global.campaign.public.conversationHostThankyou', defaultMessage);
			body = `${body}
${url}`;

			const messageData = {
				sender: get(this.props, 'global.user'),
			}

			return (
				<Messenger
					{...this.props}
					to={hosts}
					subject="Thank you for hosting a Climate Conversation"
					body={body}
					launchButtonLabel="Send Report to Host"
					onClose={this.onSendReport}
					messageData={messageData}
				/>
			);
		}

		render() {
			let actions;
			let attitudes;

			const { props } = this;
			const { error, loading, conversation, hasSent } = this.state;

			if (!loading) {
				// Only show actions/attitudes that have at least 1 person
				actions = this.state.actions
					.filter(a => a.value);
				attitudes = this.state.attitudes
					.filter(a => a.value);
			}

			if (error) {
				return <div className="error">Could not load host report: ${error}</div>;
			}

			const name = get(conversation, 'event.name', '');

			return (
				<div className="host--report__wrapper">
					<div className="host--report__header">
						<h1 className="host--report__header">{name}</h1>
						<h3 className="">Thank you for hosting a Climate Conversation</h3>
					</div>
					<div className="host--report__action">
						<div className="">Your conversation has inspired the following actions...</div>
						{actions ? actions.map(action => (
							<div className="host--report__action-item" key={action.label}>
								<div className="host--report__action-item-number">{action.value}</div>
								<div className="host--report__action-item-label">{action.label}</div>
							</div>
						)) : <Spinner /> }
					</div>
					<div className="host--report__attitudes">
						<div className="">As a result of your conversation ...</div>
						{attitudes ? attitudes.map(attitude => (
							<div className="host--report__attitude-item" key={attitude.label}>
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
						{hasSent ? (
							<ReturnButton {...props} saveTheme="secondary" saveLabel="Done" />
						) : (
							<ReturnButton {...props} saveTheme="secondary" saveLabel="Go back" />
						)}
						{this.renderSendReport()}
					</div>
				</div>
			);
		}
	};
};
