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
				const promises = [
					Conversation.loadConversation({ props: this.props, private: 1 })
						.then(res => this.setState(res)),
					Conversation.loadRsvps({ props: this.props, type: ['guest', 'facilitator', 'host'] })
						.then(res => this.setState(res)),
				];

				const [reflections, surveys] = await Promise.all([
					getData(api.interactions.getAll({
						query: {
							category: 'facilitator-reflection', recordUuid: eventUuid,
						},
					})),
					getData(api.interactions.getAll({
						query: {
							category: 'cc-post-survey-2019', recordUuid: eventUuid,
						},
					})),
				]);

				// eslint-disable-next-line object-curly-newline
				this.setState({ reflections, surveys }, this.getCounters);

				// Catch exception
				await promises;
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
						<Button href={reflectionLink}>Facilitators Reflection</Button>
						<Button href={reconcileLink}>Reconcile Donations</Button>
					</div>
					<div className="view-conversation__guest-list">
						<GuestList conversation={uuid} />
					</div>
				</div>
			);
		}
	};
};
