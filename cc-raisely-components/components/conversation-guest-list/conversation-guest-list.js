(RaiselyComponents, React) => {
	const { get } = RaiselyComponents.Common;
	const { api, Spinner } = RaiselyComponents;
	const { Button } = RaiselyComponents.Atoms;
	const { getData, getQuery } = api;

	const RaiselyButton = RaiselyComponents.import('raisely-button');
	const WhatsappButton = RaiselyComponents.import('whatsapp-button');

	class Guest extends React.Component {
		guestName = () => {
			const { preferredName, fullName } = get(this.props, 'guest', {});
			return fullName || preferredName;
		}

		legend = (s) => {
			const { guest } = this.props;
			if (get(guest, `postSurvey.private.${s.id}`)) {
				const className = `conversation-guest-legend-${s.id}`;
				return <span className={className}>{s.icon}</span>;
			}
			return '';
		}

		render() {
			const { guest } = this.props;

			const symbols = [
				{ id: 'host', icon: 'H' },
				{ id: 'facilitate', icon: 'F' },
				{ id: 'donate', icon: '$' },
				{ id: 'corporateHost', icon: 'C' },
				{ id: 'volunteer', icon: 'V' },
				{ id: 'research', icon: 'R' },
			];

			return (
				<li key={guest.uuid}>
					<div className="conversation-guest-list__name">{this.guestName()}</div>
					<div className="conversation-guest-list__email">{guest.email}</div>
					<WhatsappButton phone={guest.phoneNumber} label={guest.phoneNumber} />
					{symbols.map(this.legend)}
					<RaiselyButton recordType="person" uuid={guest.uuid} />
				</li>
			)
		}
	}

	return class ConversationGuestList extends React.Component {
		componentDidMount() {
			this.load()
				.catch((error) => {
					console.error(error);
					this.setState({ error: error.message });
				});
		}

		// eslint-disable-next-line class-methods-use-this
		async loadGuests(eventUuid) {
			const rsvps = await getData(api.eventRsvps.getAll({ query: { eventUuid, private: 1 } }));
			return rsvps
				.filter(({ type }) => type === 'guest')
				.map(rsvp => rsvp.user);
		}

		async load() {
			const eventUuid = this.props.conversation ||
				get(this.props, 'match.params.event') ||
				getQuery(get(this.props, 'router.location.search')).event;

			// We must be creating a new conversation
			if (!eventUuid) {
				throw new Error('No conversation uuid specified');
			}

			const guests = await this.loadGuests(eventUuid);

			this.setState({ guests });
		}

		render() {
			if (!this.state) {
				return <Spinner />;
			}

			const { guests, error } = this.state;

			if (error) {
				return (
					<div className="error">{error}</div>
				);
			}

			return (
				<div className="conversation-guest-list-wrapper">
					<ul className="conversation-guest-list">
						{guests.map(guest => <Guest {...this.props} guest={guest} />)}
					</ul>
					<Button>Email all Guests</Button>
				</div>
			);
		}
	};
};
