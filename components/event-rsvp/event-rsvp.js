/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const { dayjs, get } = RaiselyComponents.Common;
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
			this.buildSteps();
		}

		componentDidUpdate() {
			const event = staticGetEvent(this.props);
			if (event !== this.state.event) this.setState({ event }, this.buildSteps);
		}

		getUser = () => {
			const { example } = this.props;
			const { mock } = this.props.global.campaign;
			const user = (example || mock) ? null : get(this.props, 'global.user');

			return !this.state.skipUser && user;
		}

		getUserUuid = () => {
			const user = this.getUser();
			return user && user.uuid;
		}

		buildSteps = () => {
			const user = this.getUser();
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
			if (!UserSaveHelper) UserSaveHelper = UserSaveHelperRef().html;
			const formData = formToData(values);
			const { user: userUpdate } = formData;
			let eventRsvp = formData.event_rsvp || {};
			const { event } = this.props;
			const existingUser = this.getUser() || {};
			let user = existingUser;
			const source = get(eventRsvp, 'private.source');
			if (userUpdate && Object.keys(userUpdate).length) {
				const userToSave = {
					...existingUser,
					...userUpdate,
					source,
				};
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
		signOut = () => this.setState({ skipUser: true }, this.buildSteps);

		render() {
			const { steps, loading } = this.state;
			const { example, event } = this.props;
			const user = this.getUser();

			if (!(event || loading)) {
				return (
					<div className="error">Cannot load event for rsvp form!</div>
				);
			}
			// eslint-disable-next-line object-curly-newline
			const props = { ...this.props, steps, controller: this };

			let eventDate = '';
			if (event.startAt) {
				if (!CCEvent) CCEvent = CCEventRef().html;
				const startAt = CCEvent.inSingaporeTime(dayjs(event.startAt));
				const date = startAt.format('dddd, MMMM D');
				const time = startAt.format('h:mm a');
				eventDate = `${date} ${time}`;
			}

			return (
				<div className="custom-form--event-rsvp event-rsvp__wrapper block--purple">
					<h3>
						{(example || !event) ? '' : `Register for ${event.name}`}
					</h3>
					<h4>{eventDate}</h4>
					{user ? (
						<div className="event-rsvp-user">
							Registering as {user.fullName || user.preferredName} ({user.email})
							<Button onClick={this.signOut}>{"I'm not"} {user.preferredName}</Button>
						</div>
					) : ''}
					<CustomForm {...{ ...props }} key={this.getUserUuid()} />
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
			console.log('render native', get(props, 'event.public.rsvpFields'));
			return (
				<NativeRsvp {...{ ...props }} />
			);
		}

		renderClosed = (event) => {
			return (
				<div className="custom-form--event-rsvp event-rsvp__wrapper">
					<h3>
						{`Registration for ${event.name} has closed`}
					</h3>
				</div>
			)
		}

		render() {
			const event = this.getEvent();

			if (!get(event, 'public.canRsvp')) {
				return this.renderClosed(event);
			}

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

