(RaiselyComponents, React) => {
	const { get } = RaiselyComponents.Common;
	const { api, Spinner } = RaiselyComponents;
	const { Button } = RaiselyComponents.Atoms;
	const { getData } = api;

	const RaiselyButton = RaiselyComponents.import('raisely-button');
	const WhatsappButton = RaiselyComponents.import('whatsapp-button');
	const ConversationRef = RaiselyComponents.import('conversation', { asRaw: true });
	let Conversation;

	class Guest extends React.Component {
		guestName = () => {
			// eslint-disable-next-line object-curly-newline
			const { preferredName, fullName, phoneNumber } = get(this.props, 'guest', {});
			return fullName || preferredName || phoneNumber || '(anonymous)';
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
				<li key={guest.uuid} className="list__item">
					<div className="conversation-guest-list__name">{this.guestName()}</div>
					<div className="conversation-guest-list__email">{guest.email}</div>
					<div className="conversation-guest-list__legend">{symbols.map(this.legend)}</div>
					<div className="conversation-guest-list__buttons">
						<WhatsappButton phone={guest.phoneNumber} />
						<RaiselyButton recordType="user" uuid={guest.uuid} />
					</div>
				</li>
			);
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
			const rsvps = await getData(api.eventRsvps.getAll({ query: { event: eventUuid, private: 1 } }));
			return rsvps
				.filter(({ type }) => type === 'guest')
				.map(rsvp => rsvp.user);
		}

		async load() {
			if (!Conversation) Conversation = ConversationRef().html;
			const eventUuid = Conversation.getUuid(this.props);

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
					<ul className="conversation-guest-list list__wrapper">
						{guests.map(guest => <Guest {...this.props} guest={guest} />)}
					</ul>
					<Button>Email all Guests</Button>
				</div>
			);
		}
	};
};
