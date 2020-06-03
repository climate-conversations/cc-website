(RaiselyComponents, React) => {
	const { api, Spinner } = RaiselyComponents;
	const { getData } = api;
	const { get } = RaiselyComponents.Common;

	const EventCardRef = RaiselyComponents.import('event-card', { asRaw: true });
	let EventCard;
	const CustomSignupForm = RaiselyComponents.import('custom-signup-form');

	const signupFields = [
		'user.preferredName', 'user.email', 'user.volunteer',
		{ id: 'user.mailingList', default: 'true', hidden: 'true' },
		'user.privacyNotice',
	].map(id => (id.id ? id : { id }));

	return class EventFeed extends React.Component {
		state = { loading: true };

		componentDidMount() {
			this.load()
				.catch((e) => {
					console.error(e);
					this.setState({ loading: false, error: e.message });
				});
		}

		async load() {
			const now = new Date().toISOString();
			const { show } = this.props.getValues();

			console.log(`Event Feed loading (${show})...`);

			try {
				const searchKey = show === 'past' ? 'startAtLT' : 'startAtGTE';

				let events = await getData(api.events.getAll({
					query: {
						[searchKey]: now,
						sort: 'startAt',
						order: 'ASC',
					},
				}));

				if (!get(this.props, 'global.user.uuid')) {
					const hiddenStatus = ['cancelled', 'hidden', 'draft'];
					events = events.filter(e => !hiddenStatus.includes(get(e, 'public.status', 'ok')));
				}

				this.setState({ loading: false, events });
				console.log(`Event feed loaded (${show})`, events);
			} catch (e) {
				console.error(e);
				this.setState({ loading: false, error: 'Unable to load events' });
			}
		}

		// eslint-disable-next-line class-methods-use-this
		noEvents() {
			const rsvpProps = {
				...this.props,
				backgroundColour: 'orange',
				title: 'Come to our next event!',
				description: `
					Our volunteers are taking a well deserved break. We'll be organising some more events soon.
					Leave your name and contact and we'll let you know when there's more events coming up.`,
				fields: signupFields,
			};
			return (
				<div className="no-events">
					<CustomSignupForm {...{ ...rsvpProps }} />
				</div>
			);
		}

		render() {
			const { events, loading, error } = this.state;
			const { show } = this.props.getValues();

			if (loading) {
				return <Spinner />;
			}

			if (!EventCard) EventCard = EventCardRef().html;

			const props = {
				...this.props,
				disableLink: show === 'past',
			};

			if ((show !== 'past') && (events.length === 0)) {
				return this.noEvents();
			}

			return (
				<React.Fragment>
					{error ? (
						<div className="error">{error}</div>
					) : ''}
					<ul className="postfeed postfeed--direction-horizontal postfeed--events">
						{events.map(e => <EventCard {...props} event={e} />)}
					</ul>
				</React.Fragment>
			);
		}
	};
};
