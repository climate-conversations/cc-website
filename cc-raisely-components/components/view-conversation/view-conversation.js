(RaiselyComponents, React) => {
	const { api, Spinner } = RaiselyComponents;
	const { Button } = RaiselyComponents.Atoms;
	const { get } = RaiselyComponents.Common;
	const { getData } = api;

	const DisplayRecord = RaiselyComponents.import('display-record');
	const GuestList = RaiselyComponents.import('conversation-guest-list');
	const ConversationRef = RaiselyComponents.import('conversation', { asRaw: true });
	let Conversation;

	const fields = ['event.startAt', 'event.address1', 'event.address2'];

	return class ViewConversation extends React.Component {
		state = { loading: true };

		componentDidMount() {
			this.load();
		}
		componentDidUpdate() {
			const eventUuid = get(this.props, 'match.params.event');

			if (eventUuid !== this.state.eventUuid) {
				this.setState({ loading: true });
				this.load();
			}
		}

		// eslint-disable-next-line class-methods-use-this
		getCounters() {
			const { surveys } = this.state;
			const counters = {
				hosts: surveys.filter(s => get(s, 'private.host') || get(s, 'private.hostCorporate')).length,
				facilitators: surveys.filter(s => get(s, 'private.facilitate')).length,
			};
			this.setState({ counters });
		}

		async load() {
			try {
				if (!Conversation) Conversation = ConversationRef().html;

				const eventUuid = Conversation.getUuid(this.props);
				this.setState({ eventUuid });
				const promises = [
					Conversation.loadConversation({ props: this.props, private: 1 })
						.then(res => this.setState(res)),
					Conversation.loadRsvps({ props: this.props, type: ['guest', 'facilitator', 'host'] })
						.then(res => this.setState(res)),
				];

				const [reflections, surveys] = await Promise.all([
					getData(api.interactions.getAll({
						query: {
							category: 'facilitator-reflection', reference: eventUuid,
						},
					})),
					getData(api.interactions.getAll({
						query: {
							category: Conversation.surveyCategories().postSurvey,
							reference: eventUuid,
						},
					})),
				]);

				// eslint-disable-next-line object-curly-newline
				this.setState({ reflections, surveys }, this.getCounters);

				const [conversation, rsvpResults] = await Promise.all(promises);

				this.setState({ conversation, ...rsvpResults });
			} catch (e) {
				this.setState({ error: e.message });
				console.error(e);
			} finally {
				this.setState({ loading: false });
			}
		}

		render() {
			if (!Conversation) Conversation = ConversationRef().html;

			// eslint-disable-next-line object-curly-newline
			const { loading, error, counters, guests } = this.state;

			if (error) {
				return (
					<div className="view-conversation">
						<div className="view-converasation-error">Error: {error}</div>
					</div>
				);
			}

			const conversation = this.state.conversation || {};
			const uuid = Conversation.getUuid(this.props);
			const processLink = `/conversations/${uuid}/process`;
			const reflectionLink = `/conversations/${uuid}/view-reflections`;
			const reconcileLink = `/conversations/${uuid}/reconcile-donations`;
			const reviewLink = `/conversations/${uuid}/review`;
			const displayValues = { event: conversation };

			return (
				<div className="view-conversation">
					<div className="view-conversation__info">
						<DisplayRecord {...this.props} values={displayValues} fields={fields} />
						<div className="view-conversation__stats">
							{loading ? <Spinner /> : (
								<React.Fragment>
									<div className="view-conversation__stat">{guests.length} guests</div>
									<div className="view-conversation__stat">{counters.hosts} new hosts</div>
									<div className="view-conversation__stat">{counters.facilitators} new facilitators</div>
								</React.Fragment>
							)}
						</div>
					</div>
					<div className="view-conversation__buttons">
						<Button href={processLink}>Process Conversation</Button>
						<Button href={reviewLink}>Review Conversation</Button>
						<Button href={reflectionLink}>Facilitators Reflection</Button>
						<Button href={reconcileLink}>Reconcile Donations</Button>
					</div>
					<div className="view-conversation__guest-list">
						<GuestList {...this.props} conversation={uuid} />
					</div>
				</div>
			);
		}
	};
};
