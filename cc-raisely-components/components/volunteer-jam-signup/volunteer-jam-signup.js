(RaiselyComponents, React) => {
	const { api, Spinner } = RaiselyComponents;
	const { getData } = api;

	const EventRsvp = RaiselyComponents.import('event-rsvp');
	const EventRef = RaiselyComponents.import('event', { asRaw: true });
	const CustomSignupForm = RaiselyComponents.import('custom-signup-form');
	let Event;

	const signupFields = [
		'user.preferredName', 'user.email', 'user.phoneNumber',
		{ id: 'user.volunteer', default: 'true' },
		'user.privacyNotice',
	].map(id => (id.id ? id : { id }));

	return class EventsComingUp extends React.Component {
		state = { loading: true };

		componentDidMount() {
			this.load()
				.catch((e) => {
					console.error(e);
					this.setState({ loading: false, error: e.message });
				});
		}

		mockEvent = (category) => {
			if (!Event) Event = EventRef().html;
			return {
				name: `Example ${category}`,
				startAt: '2019-04-22T11:30Z',
				private: { eventType: category },
				public: {
					rsvpFields: Event.getDefaultRsvpFields().join(';'),
				},
			}
		}

		async load() {
			const now = new Date().toISOString();
			console.log('Loading upcoming event...`');
			const values = this.props.getValues();
			const category = values.category || 'Volunteer Jam';

			try {
				let [event] = await getData(api.events.getAll({
					query: {
						startAtGTE: now,
						eventType: category,
						limit: 1,
					},
				}));

				// Generate an event we can show in the editor
				// if one isn't available
				if (!event && !this.showFallback()) {
					event = this.mockEvent(category);
				}
				this.setState({ loading: false, event });
				console.log('Upcoming event loaded', event);
			} catch (e) {
				console.error(e);
				this.setState({ loading: false, error: 'Unable to load events' });
			}
		}

		showFallback(event, error) {
			const { mock } = this.props.global.campaign;
			if (mock) {
				const { toggleFallback } = this.props.getValues();
				return toggleFallback && (toggleFallback != 'false');
			}
			return (!event && !error);
		}

		renderSignup() {
			const signupProps = {
				...this.props,
				title: 'Join our next event',
				description: `We don't have a date for the next event, but you can leave your details
					and we'll let you know when the next one is on.`,
				fields: signupFields,
				backgroundColour: 'orange',

				...this.props.getValues(),
			};
			return (
				<div className="event-signup-fallback">
					<CustomSignupForm {...{ ...signupProps }} />
				</div>
			);
		}

		render() {
			const { event, loading, error } = this.state;

			if (loading) {
				return <Spinner />;
			}
			if (error) return <div className="error">Sorry we {"couldn't"} load the next event</div>;

			if (this.showFallback(event, error)) return this.renderSignup();

			const rsvpProps = { ...this.props, event };
			return <EventRsvp {...{ ...rsvpProps }} />;
		}
	};
};
