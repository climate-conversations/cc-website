/* eslint-disable no-use-before-define */
(RaiselyComponents, React) => {
	const { get } = RaiselyComponents.Common;
	const { api, Spinner } = RaiselyComponents;
	const { Modal } = RaiselyComponents.Molecules;
	const { getQuery, getData, quickLoad } = api;

	const Messenger = RaiselyComponents.import('message-send-and-save');
	const ReturnButton = RaiselyComponents.import('return-button');

	const HIGH_LEVEL = 8;

	const attitudeConditions = [{
		label: 'more likely to talk about climate breakdown',
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
			(fn(field ? get(current, ['private', field]) : current) ? total + 1 : total));
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
		/**
		 * Summarise actions taken at a conversation
		 * @param {} postSurveys
		 * @param {*} rsvps
		 */
		static calculateActions(postSurveys, rsvps) {
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

			return actions;
		}

		/**
		 * Summarise the attitude shifts of the guests
		 * @param {object[]} preSurveys
		 * @param {object[]} postSurveys
		 */
		// eslint-disable-next-line class-methods-use-this
		static calculateAttitudes(preSurveys, postSurveys) {
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

			return attitudes;
		}

		state = { loading: true }
		componentDidMount() {
			this.load();
		}

		async load() {
			try {
				const eventUuid = this.props.conversation ||
					get(this.props, 'match.params.event') ||
					getQuery(get(this.props, 'router.location.search')).event;

				const promises = ['cc-pre-survey-2019', 'cc-post-survey-2019'].map(category =>
					getData(api.interactions.getAll({
						query: category,
						recordUuid: eventUuid,
					})));
				promises.push(getData(api.eventRsvps.getAll({ query: { eventUuid } })));
				promises.push(quickLoad({ models: ['event'], required: true, props: this.props })
					.then(records => this.setState({ event: records.event })));

				const [preSurveys, postSurveys, rsvps] = await Promise.all(promises);

				const actions = this.constructor.calculateActions(postSurveys, rsvps);
				const attitudes = this.constructor.calculateAttitudes(preSurveys, postSurveys);

				const hosts = rsvps
					.filter(rsvp => rsvp.type === 'host')
					.map(rsvp => rsvp.user);

				this.setState({ actions, attitudes, rsvps, hosts, loading: false });
			} catch (e) {
				console.error(e);
				this.setState({ error: e.message });
			}
		}

		renderSendReport() {
			const { hosts } = this.state;
			const body = get(this.props, 'global.campaign.config.conversationHostThankyou', 'ERROR LOADING CONTENT');
			return (
				<Messenger
					to={hosts}
					subject="Thank you for hosting a Climate Conversation"
					body={body}
				/>
			);
		}

		render() {
			let actions;
			let attitudes;

			const { error, loading, event } = this.state;

			if (!loading) {
				// Only show actions/attitudes that have at least 1 person
				actions = this.state.actions
					.filter(a => a.value);
				attitudes = this.state.actions
					.filter(a => a.value);
			}

			if (error) {
				return <div className="error">Could not load host report: ${error}</div>;
			}

			const name = get(event, 'name', '');

			return (
				<div className="host--report__wrapper">
					<div className="host--report__header">
						<div className="host--report__header">{name}</div>
						<div className="">Thank you for hosting a Climate Conversation</div>
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
								</div>
								<div className="host--report__attitude-item-sublabel">
									{attitude.sublabel}
								</div>
							</div>
						)) : <Spinner /> }
					</div>
					<div className="host--report__buttons">
						<ReturnButton backTheme="secondary" backLabel="Go back" />
						<Modal
							button
							buttonTitle="Send Report to Host"
							modalContent={this.renderSendReport}
						/>
					</div>
				</div>
			);
		}
	};
};
