/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const { api } = RaiselyComponents;
	const { getData } = api;
	const { get } = RaiselyComponents.Common;
	const { Button } = RaiselyComponents.Atoms;
	const UserSaveHelperRef = RaiselyComponents.import('cc-user-save', { asRaw: true });
	const EventCard = RaiselyComponents.import('event-card');
	const CCEventRef = RaiselyComponents.import('event', { asRaw: true });
	let UserSaveHelper;
	let CCEvent;

	const CustomForm = RaiselyComponents.import('custom-form');

	class NativeRsvp extends React.Component {
		state = { loading: true };

		componentDidMount() {
			const { example } = this.props;
			const { mock } = this.props.global.campaign;

			const user = (example || mock) ? null : get(this.props, 'global.user');
			// Save the current user, if any on the state
			// to be used to decide if we need to show user fields
			this.setState({ user }, this.buildSteps);
		}

		buildSteps = () => {
			const { user } = this.state;
			const { event } = this.props;
			if (!CCEvent) CCEvent = CCEventRef().html;
			const rsvpFields = CCEvent.getRsvpFields(event, user);

			const step1 = {
				// title,
				fields: rsvpFields,
			};

			this.setState({ steps: [step1], loading: false });
		}

		save = async (values, formToData) => {
			const { event_rsvp: eventRsvp, user: userUpdate } = formToData(values);
			const { event } = this.props;
			const existingUser = this.state.user || {};
			let user = existingUser;
			if (userUpdate && Object.keys(userUpdate).length) {
				const userToSave = {
					...existingUser,
					...userUpdate,
				};
				if (!UserSaveHelper) UserSaveHelper = UserSaveHelperRef().html;
				user = await UserSaveHelper.upsertUser(userToSave);
			}

			Object.assign(eventRsvp, {
				userUuid: user.uuid,
				eventUuid: event.uuid,
			});
			if (!eventRsvp.type) eventRsvp.type = 'guest';
			eventRsvp.type = 'guest';

			await UserSaveHelper.proxy(`/events/${event.uuid}/rsvps`, {
				method: 'POST',
				body: { data: eventRsvp },
			});
		}

		// Remove user from the state to create a new user from the RSVP
		signOut = () => this.setState({ user: null }, this.buildSteps);

		render() {
			const { steps, user, loading } = this.state;
			const { example, event } = this.props;

			if (!(event || loading)) {
				return (
					<div className="error">Cannot load event for rsvp form!</div>
				);
			}
			// eslint-disable-next-line object-curly-newline
			const props = { ...this.props, steps, controller: this };

			return (
				<div className="custom-form--event-rsvp event-rsvp__wrapper block--purple">
					<h3>
						{(example || !event) ? '' : `Register for ${event.name}`}
					</h3>
					{user ? (
						<div className="event-rsvp-user">
							Registering as {user.fullName || user.preferredName} ({user.email})
							<Button onClick={this.signOut}>{"I'm not"} {user.preferredName}</Button>
						</div>
					) : ''}
					<CustomForm {...{ ...props }} />
				</div>
			);
		}
	}

	function staticGetEvent(props) {
		const { mock } = props.global.campaign;
		if (mock) {
			return {
				name: 'Example Event',
			};
		}

		return get(props, 'event') ||
			get(props, 'global.current.event');
	}

	return class EventRsvp extends React.Component {
		state = {};
		static getDerivedStateFromProps(props, state) {
			const event = staticGetEvent(props);
			if (event !== state.event) return { event };
		}

		getEvent = () => staticGetEvent(this.props);

		renderEmbed = (event) => {
			const innerHtml = { __html: event.signupEmbed };
			// eslint-disable-next-line react/no-danger
			return <div dangerouslySetInnerHTML={innerHtml} />;
		}

		renderLink = (event) => {
			const props = { ...this.props, hideEdit: 1, event };
			return (
				<EventCard {...{ ...props }} />
			);
		}

		renderNative = (event) => {
			const props = { ...this.props, event };
			return (
				<NativeRsvp {...{ ...props }} />
			);
		}

		render() {
			const event = this.getEvent();

			if (!CCEvent) CCEvent = CCEventRef().html;
			const method = CCEvent.getRsvpMethod(event);

			let renderMethod = this.renderNative;
			if (method === 'embed') renderMethod = this.renderEmbed;
			else if (method === 'link') renderMethod = this.renderLink;

			console.log('Rendering', event, method, renderMethod);

			return (
				<div className="event-rsvp__wrapper">
					{renderMethod(event)}
				</div>
			);
		}
	};
};

