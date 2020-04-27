(RaiselyComponents, React) => {
	const { get } = RaiselyComponents.Common;
	const { api, Spinner } = RaiselyComponents;
	const { Button, Icon } = RaiselyComponents.Atoms;
	const { getData } = api;

	const RaiselyButton = RaiselyComponents.import('raisely-button');
	const WhatsappButton = RaiselyComponents.import('whatsapp-button');
	const ConversationRef = RaiselyComponents.import('conversation', { asRaw: true });
	const ReturnButtonRef = RaiselyComponents.import('return-button', { asRaw: true });
	let Conversation;
	let ReturnButton;

	class Guest extends React.Component {
		guestName = () => {
			// eslint-disable-next-line object-curly-newline
			const { preferredName, fullName, phoneNumber } = get(this.props, 'guest', {});
			return fullName || preferredName || phoneNumber || '(anonymous)';
		}

		legend = (s) => {
			const { guest } = this.props;
			if (get(guest, `postSurvey.detail.private.${s.id}`)) {
				const className = `conversation-guest-legend-${s.id}`;
				return <span className={className}>{s.icon}</span>;
			}
			return '';
		}

		render() {
			const { guest } = this.props;
			const { user } = guest;

			const symbols = [
				{ id: 'host', icon: 'H' },
				{ id: 'facilitate', icon: 'F' },
				{ id: 'donate', icon: 'D' },
				{ id: 'corporateHost', icon: 'C' },
				{ id: 'volunteer', icon: 'V' },
				{ id: 'research', icon: 'R' },
				{ id: 'fundraise', icon: '$' },
			];
			const surveyLink = `/surveys/${guest.uuid}`;

			const email = user.email.endsWith('.test') || user.email.endsWith('.invalid') ?
				'(no email)' : user.email;

			return (
				<li key={guest.uuid} className="list__item">
					<div className="conversation-guest-list__name">{this.guestName()}</div>
					<div className="conversation-guest-list__email">{email}</div>
					<div className="conversation-guest-list__legend">{symbols.map(this.legend)}</div>
					<div className="conversation-guest-list__buttons">
						<Icon name="list_alt" href={surveyLink} />
						<WhatsappButton phone={guest.phoneNumber} />
						<RaiselyButton recordType="user" uuid={guest.uuid} />
					</div>
				</li>
			);
		}
	}

	return class ConversationGuestList extends React.Component {
		state = { guests: [] }
		componentDidMount() {
			this.load();
		}

		componentDidUpdate() {
			if (!Conversation) Conversation = ConversationRef().html;
			const eventUuid = Conversation.getUuid(this.props);
			// Reload the conversation and guests if the id has changed
			console.log('Update', eventUuid, this.state.eventUuid)
			if (eventUuid !== this.state.eventUuid) {
				this.load();
			}
		}

		async load() {
			try {
				if (!Conversation) Conversation = ConversationRef().html;
				const eventUuid = Conversation.getUuid(this.props);
				console.log('setState', eventUuid)

				this.setState({ eventUuid });

				// We must be creating a new conversation
				if (!eventUuid) {
					throw new Error('No conversation uuid specified');
				}

				const { guests } = await Conversation.loadRsvps({ props: this.props });

				this.setState({ guests });

				await guests.map(async (guest) => {
					const { post } = await Conversation.loadSurveys(guest, ['post']);
					guest.postSurvey = post;
					this.setState({ guests });
				});
			} catch (error) {
				console.error(error);
				this.setState({ error: error.message || 'An unknown error occurred' });
			}
		}

		render() {
			if (!this.state) {
				return <Spinner />;
			}
			if (!Conversation) Conversation = ConversationRef().html;
			const eventUuid = Conversation.getUuid(this.props);

			const { guests, error } = this.state;

			if (error) {
				return (
					<div className="error">{error}</div>
				);
			}
			if (!ReturnButton) ReturnButton = ReturnButtonRef().html;
			const returningEmailLink = ReturnButton.createReturningLink({ props: this.props, url: `/conversations/${eventUuid}/email-guests` });
			console.log('Returning link: ', returningEmailLink)

			return (
				<div className="conversation-guest-list-wrapper">
					<ul className="conversation-guest-list list__wrapper">
						{guests.map(guest => <Guest key={guest.uuid} {...this.props} guest={guest} />)}
					</ul>
					<Button href={returningEmailLink}>Email all Guests</Button>
				</div>
			);
		}
	};
};
