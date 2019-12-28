(RaiselyComponents, React) => {
	const { api, Spinner } = RaiselyComponents;
	const { Button } = RaiselyComponents.Atoms;
	const { getData } = api;
	const { dayjs, get } = RaiselyComponents.Common;

	const Messenger = RaiselyComponents.import('message-send-and-save');

	function Checkbox({ label, onChange, value, disabled }) {
		const labelClass = `form-field__label-text ${disabled ? 'disabled' : ''}`;
		return (
			<div className="field-wrapper">
				<div className="form-field form-field--checkbox form-field--not-empty form-field--valid">
					<label onClick={() => !disabled && onChange({ value: !value })}>
						<input
							type="checkbox"
							onChange={(e) => {
								e.stopPropagation();
								if (!disabled) {
									onChange(!value);
								}
							}}
							disabled={disabled}
							className="form-field--checkbox__inline"
							checked={value} />
						<span className={labelClass}>{label}</span>
					</label>
				</div>
			</div>
		);
	}
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
						.quickLoad({ props: this.props, models: ['event'], required: true }));

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
			try {
				rsvp.attended = val;
				await getData(api.eventRsvps.update({
					id: rsvp.id,
					data: {
						data: {
							attended: rsvp.attended,
						},
					},
				}));
			} catch (e) {
				console.error(e);
				this.setState({ error: e.message });
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
							body=''
							launchButtonLabel="Message"
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
								body=''
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
