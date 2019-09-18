(RaiselyComponents, React) => {
	const { api, Spinner } = RaiselyComponents;
	const { Button } = RaiselyComponents.Atoms;
	const { get } = RaiselyComponents.Common;
	const { quickLoad, getQuery, getData } = api;

	const DisplayRecord = RaiselyComponents.import('display-record');
	const GuestList = RaiselyComponents.import('conversation-guest-list');

	const fields = ['event.startAt', 'event.address1', 'event.address2'];

	return class ViewConversation extends React.Component {
		state = { loading: true };

		componentDidMount() {
			this.load();
		}

		// eslint-disable-next-line class-methods-use-this
		async getRsvps(eventUuid) {
			const rsvps = await getData(api.eventRsvps.getAll({ query: { eventUuid, private: 1 } }));
			return rsvps;
		}

		getFacilitator(rsvps) {
			const facils = rsvps
				.filter(({ type }) => ['facilitator', 'co-facilitator'].includes(type))
				.map(rsvp => rsvp.user);

			const userUuid = get(this.props, 'current.user.uuid');
			const facilitator = facils.find(f => f.uuid === userUuid) || facils[0];
			return facilitator;
		}
		// eslint-disable-next-line class-methods-use-this
		getCounters(surveys) {
			return {
				hosts: surveys.filter(s => get(s, 'private.host') || get(s, 'private.hostCorporate')).length,
				facilitators: surveys.filter(s => get(s, 'private.facilitate')).length,
			};
		}

		async load() {
			try {
				const eventUuid = this.props.conversation ||
					get(this.props, 'match.params.event') ||
					getQuery(get(this.props, 'router.location.search')).event;


				const promise = quickLoad({ models: ['event.private'], required: true, props: this.props })
					.then(({ event: conversation }) => this.setState({ conversation }));

				const rsvps = await this.getRsvps();
				const facilitator = await this.getFacilitator(rsvps);

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
				const guests = rsvps
					.filter(r => r.type === 'guest');

				const counters = this.getCounters(rsvps, surveys);
				// eslint-disable-next-line object-curly-newline
				this.setState({ reflections, surveys, guests, counters });

				// Catch exception
				await promise;
			} catch (e) {
				this.setState({ error: e.message });
				console.error(e);
			} finally {
				this.setState({ loading: false });
			}
		}

		render() {
			// eslint-disable-next-line object-curly-newline
			const { loading, error, counters, guests } = this.state;

			if (error) {
				return (
					<div className="view-conversation">
						<div className="view-converasation-error">Error: {error}</div>
					</div>
				);
			}

			const conversation = this.state.conversation || get(this.props, 'global.current.event');
			const { uuid } = conversation;
			const processLink = `/conversations/${uuid}/process`;
			const reflectionLink = `/conversations/${uuid}/view-reflections`;
			const reconcileLink = `/conversations/${uuid}/reconcile-donations`;
			const displayValues = { event: conversation };

			return (
				<div className="view-conversation">
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
