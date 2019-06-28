(RaiselyComponents, React) => {
	const { get } = RaiselyComponents.Common;

	class Guest extends React.Component {
		guestName = () => {
			const { prefName, firstName } = get(this.props, 'guest', {});
			return prefName || firstName;
		}

		raisely = () => {
			const uuid = get(this.props, 'guest.uuid');
			return uuid ? `https://admin.raisely.com/people/${uuid}`;
		}

		legend = (s) => {
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
				{ id: 'corporate', icon: 'C' },
				{ id: 'volunteer', icon: 'V' },
				{ id: 'research', icon: 'R' },
			]

			return (
				<li key={guest.uuid}>
					<div className="">{this.guestName()}</div>
					<Button>{this.guestPhone()}</Button>
					{symbols.map(this.legend)}
					<Link target="raisely" href={this.raisely()}>View in Raisely</Link>
				</li>
			)
		}
	}

	return class ConversationGuestList extends React.Component {
		load() {
			// load guests
			// load surveys
		}

		render() {
			const { guests } = this.state;

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
