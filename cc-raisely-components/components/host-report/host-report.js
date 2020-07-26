/* eslint-disable no-use-before-define */
(RaiselyComponents, React) => {
	const { get } = RaiselyComponents.Common;
	const { ProgressBar } = RaiselyComponents.Atoms;
	const { api, Spinner } = RaiselyComponents;
	const { getQuery, getData } = api;

	const Messenger = RaiselyComponents.import('message-send-and-save');
	const ReturnButton = RaiselyComponents.import('return-button');
	const ConversationRef = RaiselyComponents.import('conversation', { asRaw: true });
	const CCUserSaveRef = RaiselyComponents.import('cc-user-save', { asRaw: true });
	let Conversation;
	let CCUserSave;

	const attitudeLabels = [
		{
			id: "increased-talkativeness",
			label: "now is more likely to talk about the climate crisis",
			plural: "now are more likely to talk about the climate crisis",
		},
		{
			id: "increased-priority",
			label: "views the climate crisis as a higher priority",
			plural: "view climate crisis as a higher priority",
			sublabel: "(than they did before the conversation)",
		},
		{
			id: "high-priority",
			label: "now views the climate crisis as the highest priority",
			plural: "now view the climate crisis as the highest priority",
			sublabel: "(and they didn't before)",
		},
		{
			id: "increased-hope",
			label:
				"feels more hopeful about our ability to act on the climate crisis",
			plural:
				"feel more hopeful about our ability to act on the climate crisis",
		},
		{
			id: "increased-agency",
			label: "feels a greater sense of agency to act on the climate crisis",
			plural: "feel a greater sense of agency to act on the climate crisis",
		},
		{
			id: "high-agency",
			label: "feels highly empowered",
			plural: "feel highly empowered",
		},
		{
			id: "highly-recomends",
			label: "would highly recommend Climate Conversations",
		}
	];

	const mockResponse = {
		actions: ['hosts', 'facilitators', 'donations', 'volunteers']
			.map((action, index) =>
				({ label: action, value: index + 1 })),
		attitudes: [
			{ id: "increased-talkativeness", value: 7 },
			{ id: "increased-priority", value: 8 },
			{ id: "high-priority", value: 3 },
			{ id: "increased-hope", value: 5 },
			{ id: "increased-agency", value: 6 },
			{ id: "high-agency", value: 2 },
			{ id: "highly-recomends", value: 4 },
		],
		startAt: '2020-09-21T12:00',
	};

	function BarChart({ goal, value, id, size }) {
		const className = `host-report__progress-bar--${id}`
		return (
			<div className={className}>
				<ProgressBar
					displaySource="custom"
					statPosition="middle"
					total={value}
					goal={goal}
					showTotal={false}
					showGoal={false}
					style="rounded"
					unit=" "
					size={size || 'medium'}
				/>
			</div>
		);
	}

	return class HostReport extends React.Component {
		state = { loading: true }
		componentDidMount() {
			this.load();
		}
		componentDidUpdate() {
			const eventUuid = this.getEventUuid();
			// Reload the conversation and guests if the id has changed
			if (eventUuid && (this.state.eventUuid !== eventUuid)) {
				this.setState({ loading: true });
				this.load();
			}
		}

		getEventUuid() {
			const eventUuid =
				this.props.conversation ||
				get(this.props, "match.params.conversation") ||
				getQuery(get(this.props, "router.location.search")).event;
			return eventUuid;
		}

		async load() {
			try {
				let report;

				const eventUuid = this.getEventUuid();
				this.setState({ eventUuid });

				const { mock } = this.props.global.campaign;
				if (mock) {
					report = mockResponse;
				} else {
					if (!Conversation) Conversation = ConversationRef().html;
					if (!CCUserSave) CCUserSave = CCUserSaveRef().html;

					const url = `${CCUserSave.proxyHost()}/hostReport/${eventUuid}`;
					report = await CCUserSave.doFetch(url, {
						query: {
							pre: Conversation.surveyCategories().preSurvey,
							post: Conversation.surveyCategories().postSurvey,
						},
					});
				}

				this.labelAttitudes(report.attitudes);
				const maximumValue = this.setMaximum(report);

				this.setState({
					loading: false,
					...report,
					maximumValue,
				});
			} catch (e) {
				console.error(e);
				this.setState({ error: e.message });
			}
		}

		setMaximum = ({ attitudes, actions }) => {
			const allValues = [...attitudes, ...actions].map(a => a.value);
			return Math.max(...allValues);
		}

		labelAttitudes(attitudes) {
			attitudes.forEach(attitude => {
				const labels = attitudeLabels.find(al => al.id === attitude.id);
				Object.assign(attitude, labels);
			});
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
			const {
				error,
				loading,
				conversation,
				hasSent,
				maximumValue,
			} = this.state;

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
								<div className="host--report__action-item-description">
									<div className="host--report__action-item-number">{action.value}</div>
									<div className="host--report__action-item-label">{action.label}</div>
								</div>
								<div className="host--report__action-item-bar">
									<BarChart
										value={action.value}
										goal={maximumValue}
										id={action.label}
									/>
								</div>
							</div>
						)) : <Spinner /> }
					</div>
					<div className="host--report__attitudes">
						<div className="">As a result of your conversation ...</div>
						{attitudes ? attitudes.map(attitude => (
							<div className="host--report__attitude-item" key={attitude.label}>
								<div className="host--report__attitude-item-bar">
									<BarChart
											value={attitude.value}
											goal={maximumValue}
											id={attitude.id}
											size="small"
										/>
								</div>
								<div className="host--report__attitude-item-description">
									<div className="host--report__attitude-item-number">{attitude.value}</div>
									<div className="host--report__attitude-item-label">
										{attitude.value === 1 ? `person ${attitude.label}` : `people ${attitude.plural || attitude.label}` }
										<div className="host--report__attitude-item-sublabel">
											{attitude.sublabel}
										</div>
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
