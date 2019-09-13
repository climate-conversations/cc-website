import { api } from "../../../raisely-modules/packages/raisely-api/src/api";

(RaiselyComponents, React) => {
	const { Spinner } = RaiselyComponents;
	const { Button } = RaiselyComponents.Atoms;
	const { quickLoad, getQuery, getData } = RaiselyComponents.api;
	const { get } = RaiselyComponents.Common;

	const DisplayRecord = RaiselyComponents.import('display-record');
	const GuestList = RaiselyComponents.import('conversation-guest-list');

	const fields = ['event.date', 'event.name', 'event.address1', 'event.address2'];

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
				hosts: surveys.filter(s => get(s, 'private.host') || get(s, 'private.hostCorporate')),
				facilitators: surveys.filter(s => get(s, 'private.facilitate')),
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
			if (!this.state) {
				return <Spinner />;
			}
			const { conversation, loading, error, counters, guests } = this.state;

			if (loading) {
				return <Spinner />;
			}
			if (error) {
				return (
					<div className="view-conversation">
						<div className="view-converasation-error">Error: {error}</div>
					</div>
				);
			}

			return (
				<div className="view-conversation">
					<DisplayRecord event={conversation} fields={fields} />
					<div className="view-conversation__stats">
						<div className="view-conversation__stat">{guests.length} guests</div>
						<div className="view-conversation__stat">{counters.hosts} new hosts</div>
						<div className="view-conversation__stat">{counters.facilitators} new facilitators</div>
					</div>
					<div className="view-conversation__buttons">
						<Button>Process Conversation</Button>
						<Button>Facilitators Reflection</Button>
						<Button>Reconcile Donations</Button>
					</div>
					<div className="view-conversation__guest-list">
						<GuestList conversation={conversation.uuid} />
					</div>
				</div>
			);
		}
	};
};
