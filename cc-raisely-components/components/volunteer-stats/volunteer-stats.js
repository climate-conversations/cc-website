(RaiselyComponents, React) => {
	const { Spinner } = RaiselyComponents;
	const { get } = RaiselyComponents.Common;

	const ConversationRef = RaiselyComponents.import('conversation', { asRaw: true });
	const CCUserSaveRef = RaiselyComponents.import('cc-user-save', { asRaw: true });
	const FacilitatorRef = RaiselyComponents.import('facilitator', { asRaw: true });
	let Conversation;
	let CCUserSave;
	let Facilitator;

	// Labels of items (in the order they will appear)
	const labels = [{
		id: 'attendees',
		label: 'People reached',
		description: '',
	}, {
		id: 'talkativeness',
		label: 'Inspired to speak up',
		description: 'The number of people that felt highly inspired to speak up about the climate crisis after a conversation',
	}, {
		id: 'complete',
		label: 'Conversations',
		description: 'Number of completed conversations',
	}, {
		id: 'booked',
		label: 'Booked',
		description: 'Number of booked conversations',
	}];

	return class VolunteerStats extends React.Component {
		state = { loading: true };

		componentDidMount() {
			this.load();
		}

		async load() {
			this.setState({ loading: true });
			try {
				if (!Facilitator) Facilitator = FacilitatorRef().html;

				let stats;
				const teamMode = Facilitator.isTeamMode(this.props);
				const { mock } = this.props.global.campaign;
				if (mock) {
					stats = this.mockResponse(teamMode);
				} else {
					const userUuid = await this.getUserUuids();
					stats = await (teamMode ? this.loadTeam(userUuid) : this.loadFacil(userUuid));
				}

				const labelledStats = labels
					.map(l => ({ ...l, value: stats[l.id] }))
					// Remove any stats that are zero
					.filter(l => l.value);

				this.setState({ stats: labelledStats, loading: false });
			} catch (e) {
				console.error(e);
				this.setState({ error: e.message, loading: false });
			}
		}

		mockResponse(teamMode) {
			return teamMode ? {
				complete: 6,
				booked: 4,
			} : {
				attendees: 12,
				talkativeness: 4,
			}
		}

		async getUserUuids() {
			const facilitators = await Facilitator.getTeamOrFacilitators(this.props);
			const uuids = facilitators
				.map((f) => {
					// Map it to it's uuid to create the query param
					return f.uuid;
				})
				.join(',');
			return uuids;
		}

		async loadTeam(userUuid) {
			const campaignUuid = this.props.global.uuid;
			const conversations = await Facilitator.loadConversations(
				campaignUuid,
				userUuid
			);
			const stats = {
				complete: conversations.filter(c => get(c, 'private.status' === 'complete')).length,
				booked: conversations.filter(c => get(c, 'private.status' === 'booked')).length,
			};
			console.log('team stats', stats)
			return stats;
		}

		async loadFacil(userUuid) {
			if (!Conversation) Conversation = ConversationRef().html;
			if (!CCUserSave) CCUserSave = CCUserSaveRef().html;

			const url = `${CCUserSave.proxyHost()}/facilReport/${userUuid}`;
			const report = await CCUserSave.doFetch(url, {
				query: {
					pre: Conversation.surveyCategories().preSurvey,
					post: Conversation.surveyCategories().postSurvey,
				},
			});

			const talkativeness = report.attitudes.find(a => a.id === 'increased-talkativeness');

			return {
				attendees: report.attendees,
				talkativeness: talkativeness.value,
			};
		}

		render() {
			const { loading, stats, error } = this.state;
			if (loading) return <Spinner />
			if (error) return <p className="error">{error}</p>

			return (
				<div className="volunteer-stats">
					{stats.map(stat => (
						<div className="volunteer-stats__item">
							<div className="volunteer-stats__label">
								{stat.label}
							</div>
							<div className="volunteer-stats__value">
								{stat.value}
							</div>
						</div>
					))}
				</div>
			);
		}
	};

}
