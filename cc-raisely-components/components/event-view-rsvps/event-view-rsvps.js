(RaiselyComponents, React) => {
	const { api, Spinner } = RaiselyComponents;
	const { Button } = RaiselyComponents.Atoms;
	const { getData } = api;
	const { dayjs, get } = RaiselyComponents.Common;

	const Messenger = RaiselyComponents.import('message-send-and-save');
	const UserSaveHelperRef = RaiselyComponents.import('cc-user-save', { asRaw: true });
	const Checkbox = RaiselyComponents.import('checkbox');
	let UserSaveHelper;

	const DEFAULT_MESSAGE = `Hi {{user.preferredName}},
With gratitude,
{{sender.preferredName}}`;


	return class EventViewRsvps extends React.Component {
		state = { loading: true };
		componentDidMount() {
			this.load();
		}
		mock() {
			const event = {
				name: 'Test Event',
				startAt: '2019-08-27',
			}
			const rsvps = [{
				attended: false,
				guests: 2,
				user: {
					preferredName: 'Alex',
					phoneNumber: '12345678',
					email: 'test@test.invalid',
				}
			}, {
				attended: true,
				guests: 1,
				user: {
					fullName: 'John Smith',
					email: 'test2@test.invalid',
				}
			}];
			return { event, rsvps };
		}
		async load() {
			try {
				const { mock } = this.props.global.campaign;
				let rsvps;
				let event;
				if (mock) {
					({ event, rsvps } = this.mock());
				} else {
					({ event } = await api
						.quickLoad({ props: this.props, models: ['event.private'], required: true }));

					rsvps = await getData(api.eventRsvps.getAll({ query: { event: event.uuid, private: 1 } }));
				}
				const guestCount = rsvps.reduce((prev, rsvp) => prev + rsvp.guests, 0);

				this.setState({ loading: false, event, rsvps, guestCount });
			} catch (e) {
				console.error(e);
				this.setState({ loading: false, error: e.message });
			}
		}

		cancel = async (rsvp, name) => {
			try {
				const confirm = window.confirm(`Are you sure you want to delete RSVP for ${name}?`);
				if (confirm) {
					rsvp.deletedAt = new Date();
					await getData(api.eventRsvps.delete({ id: rsvp.id }));
				}
			} catch (e) {
				rsvp.deletedAt = null;
				console.error(e);
				this.setState({ error: e.message });
			}
		}
		markAttended = async (rsvp, val) => {
			// Checkbox seems to send 2 events, one with val as a boolean, one with val as an object
			// this drops one of them so we don't double our requests to the server
			if (val.value || val.value === false) return null;
			try {
				const { event } = this.state;
				rsvp.attended = val;

				if (!UserSaveHelper) UserSaveHelper = UserSaveHelperRef().html;
				const promises = [
					UserSaveHelper.proxy(`/event_rsvps/${rsvp.uuid}`, {
						method: 'PATCH',
						body: {
							data: {
								attended: rsvp.attended,
							},
							partial: true,
						}
					}),
				];
				// If it's a public conversation, note that the user has attended the conversation
				if (val && (get(event, 'public.eventType') === 'Public Conversation')) {
					promises.push(
						UserSaveHelper.proxy(`/users/${rsvp.userUuid}`, {
							method: 'PATCH',
							body: {
								data: {
									private: {
										attendedConversation: true,
									},
								},
								partial: true,
							},
						}));
				}
				await Promise.all(promises);
				this.setState({ error: null });
			} catch (e) {
				this.setState({ error: e.message || 'Unable to save attendance' });
				console.error(e);
			}
		}
		getSubject() {
			const { event } = this.state;
			return `${event.name} ${dayjs(event.startAt).format('dddd, D MMM')}`
		}

		renderRow = (rsvp, index) => {
			const { user } = rsvp;
			const userName = get(user, 'fullName') || get(user, 'preferredName');
			const subject = this.getSubject();
			const messageData = {
				sender: get(this.props, 'global.user'),
			}
			return (
				<li className="flex-table-row">
					<span className="row-field small-field">{index + 1}</span>
					<span className="row-field">{userName}</span>
					<span className="row-field">{user.email}</span>
					<span className="row-field">{user.phoneNumber}</span>
					<span className="row-field  small-field">{rsvp.guests}</span>
					<div className="row-field  small-field">
						<Checkbox value={rsvp.attended} onChange={attended => this.markAttended(rsvp, attended)}  />
					</div>
					<div className="row-buttons">
						<Messenger
							{...this.props}
							sendBy='whatsapp'
							to={[user]}
							subject={subject}
							body={DEFAULT_MESSAGE}
							launchButtonLabel="Message"
							messageData={messageData}
						/>
						<Button onClick={() => this.cancel(rsvp, userName)}>Delete</Button>
					</div>
				</li>
			)
		}

		render() {
			const { error, loading, rsvps, guestCount } = this.state;
			let to, subject;
			if (rsvps) {
				to = rsvps.map(r => r.user);
				subject = this.getSubject();
			}
			const messageData = {
				sender: get(this.props, 'global.user'),
			}
			return (
				<div className="event-view-rsvps__wrapper">
					{error ? (
						<div className="error"><p>{error}</p></div>
					) : ''}
					{loading ? <Spinner /> : ''}
					{rsvps ? (
						<React.Fragment>
							<Messenger
								{...this.props}
								sendBy='email'
								to={to}
								subject={subject}
								body={DEFAULT_MESSAGE}
								messageData={messageData}
								launchButtonLabel="Message all Guests"
							/>
							<div className="event-view-rsvps__stats">
								RSVPs: {rsvps.length}, Guests: {guestCount}
							</div>
							<ol className="list__wrapper event-view-rsvps__list">
								<li className="flex-table-row flex-table-header-row">
									<span className="row-field index-field" />
									<span className="row-field row-field">Name</span>
									<span className="row-field row-field">Email</span>
									<span className="row-field row-field">Phone</span>
									<span className="row-field small-field">Guests</span>
									<span className="row-field small-field">Attended</span>
									<div className="row-buttons"></div>
								</li>
								{rsvps ? rsvps.map(this.renderRow) : ''}
							</ol>
						</React.Fragment>
					) : ''}
				</div>
			);
		}
	}
}
