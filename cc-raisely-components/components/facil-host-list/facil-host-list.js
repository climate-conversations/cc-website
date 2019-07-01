(RaiselyComponents, React) => {
	const { Icon, Button } = RaiselyComponents.Atoms;
	const { get, dayjs } = RaiselyComponents.Common;
	const { api } = RaiselyComponents;

	const icons = {
		public: 'public',
		private: 'supervised_user',
		corporate: 'accessibility_new',
	};

	class Host extends React.Component {
		componentDidMount() {
			this.setTimes();
		}

		setTimes() {
			// eslint-disable-next-line object-curly-newline
			const { cashDonationsNotes, cashTransferAmount, cashReceivedAmount, cashCtaAmount, processAt } = get(this.props, 'conversation.private', {});

			const startAt = get(this.props, 'conversation.startAt');

			this.processOverdue = processAt.add(1, 'day');
			this.startAt = dayjs(startAt);
			this.displayDate = this.startAt.format('DD/MM/YYYY');

			this.reconciled = cashDonationsNotes ||
				((cashTransferAmount === cashReceivedAmount) && (cashTransferAmount === cashCtaAmount));
		}

		render() {
			const { now, conversation, showFacil } = this.props;

			const { conversationType, isProcessed } = get(conversation, 'private', {});

			const overdue = this.processOverdue.isBefore(now) && !isProcessed;
			const hasPassed = this.startAt.isBefore(now);

			const warning = overdue || !this.reconciled;

			const icon = (warning ? 'warning' : icons[conversationType]) || icons.private;

			return (
				<li className="conversation-list-item" key={conversation.uuid}>
					<Icon name={icon} />
					<div className="conversation-start">{this.displayDate}</div>
					<div className="conversation-name">{conversation.name}</div>
					{showFacil ? <div className="conversation-facil">{conversation.name}</div> : ''}
					<Button>edit</Button>
					{hasPassed && !isProcessed ? <Button>process</Button> : ''}
				</li>
			);
		}
	}

	return class FacilHostList extends React.Component {
		state = { filter: true };

		componentDidMount() {
			this.load();
		}

		setHosts = () => {
			const hostStatus = ['lead', 'interested', 'booked', 'complete', 'not interested'];
			const filterStatus = ['lead', 'interested'];

			let { hosts } = this;
			if (this.state.filter) {
				hosts = this.hosts
					.filter(h => filterStatus.includes(get(h, 'private.status')));
			}

			this.setState({ hosts });
		}

		async getUserUuids() {
			const currentUserUuid = get(this.props, 'global.user.uuid');
			let uuids = currentUserUuid;

			if (this.isTeam()) {
				uuids = await api.users.getAll({
					query: {
						'private.teamLeaderUuid': currentUserUuid,
					},
				});
			}

			return uuids;
		}

		async load() {
			const userUuid = this.getUserUuids();
			// const rsvps = await api.eventRsvps.getAll({
			// 	query: {
			// 		userUuid,
			// 		type: 'facilitator,co-facilitator',
			// 	},
			// });
			// this.conversations = rsvps.map((rsvp) => {
			// 	// eslint-disable-next-line no-param-reassign
			// 	rsvp.event.facilitator = rsvp.user;
			// 	return rsvp.event;
			// });
		}

		toggleFilter = () => {
			// If we're about to switch to filtered
			this.setState({	filter: !this.state.filter }, this.setHosts);
		}

		render() {
			const now = dayjs();
			const { conversations, filter } = this.state;
			const isTeam = this.isTeam();

			return (
				<div className="ohst-list__wrapper">
					<Button onClick={this.toggleFilter}>
						{filter ? 'Show All' : 'Show Outstanding' }
					</Button>
					<ul className="host-list">
						{conversations.map(conversation => (
							<Host
								{...this.props}
								now={now}
								showFacil={isTeam}
								conversation={conversation} />
						))}
					</ul>
				</div>
			);
		}
	};
};