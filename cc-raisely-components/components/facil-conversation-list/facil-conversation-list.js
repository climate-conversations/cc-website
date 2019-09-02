(RaiselyComponents, React) => {
	const { Icon, Button } = RaiselyComponents.Atoms;
	const { get, dayjs } = RaiselyComponents.Common;
	const { api, Spinner, Link } = RaiselyComponents;

	const icons = {
		public: 'public',
		private: 'home',
		corporate: 'work',
	};

	async function doApi(promise) {
		const response = await promise;
		const status = response.statusCode();
		if (status >= 400) {
			const message = get(response.body(), 'errors[0].message', 'An unknown error has occurred');
			console.error(response.body());
			throw new Error(message);
		}
		return response.body().data().data;
	}

	class Conversation extends React.Component {
		setTimes() {
			// eslint-disable-next-line object-curly-newline
			const { cashDonationsNotes, cashTransferAmount, cashReceivedAmount, cashCtaAmount, processAt } = get(this.props, 'conversation.private', {});

			const startAt = get(this.props, 'conversation.startAt');


			this.startAt = dayjs(startAt);
			this.processOverdue = dayjs(processAt || startAt).add(1, 'day');
			this.displayDate = this.startAt.format('DD MMM');

			this.reconciled = cashDonationsNotes ||
				((cashTransferAmount === cashReceivedAmount) && (cashTransferAmount === cashCtaAmount));
		}

		render() {
			if (!this.startAt) this.setTimes();

			const { now, conversation, showFacil } = this.props;

			const { conversationType, isProcessed } = get(conversation, 'private', {});

			const overdue = this.processOverdue.isBefore(now) && !isProcessed;
			const hasPassed = this.startAt.isBefore(now);

			const warning = overdue || !this.reconciled;

			const icon = (warning ? 'warning' : icons[conversationType]) || icons.private;

			const tooltip = `${conversationType} conversation ${warning ? '(action overdue)' : ''}`;

			let defaultUrl = `/conversations/${conversation.uuid}/view`;
			const processUrl = `${defaultUrl}/process`;

			if (!hasPassed) defaultUrl += '/edit';

			return (
				<li className="conversation-list-item" key={conversation.uuid}>
					<Link className="list__item" href={defaultUrl}>
						<Icon name={icon} title={tooltip} />
						<div className="conversation-name list__item--title">
							{conversation.name}
							<div className="conversation-start list__item--subtitle">{this.displayDate}</div>
							{showFacil ? <div className="conversation-facil">Chris Jensen</div> : ''}
						</div>
						{hasPassed && !isProcessed ? (
							<Button className="button-small button-secondary" href={processUrl}>process</Button>
						) : ''}
					</Link>
				</li>
			);
		}
	}

	return class FacilConversationList extends React.Component {
		state = { filter: true, loading: true };

		componentDidMount() {
			this.load();
		}

		setConversations = () => {
			let { conversations } = this;
			if (this.state.filter) {
				conversations = this.conversations
					.filter(c => !get(c, 'private.isProcessed'));
			}

			this.setState({ conversations, loading: false });
		}

		async getUserUuids() {
			const currentUserUuid = get(this.props, 'global.user.uuid');
			let uuids = currentUserUuid;

			if (this.isTeam()) {
				const facils = await doApi(api.users.getAll({
					query: {
						'private.teamLeaderUuid': currentUserUuid,
					},
				}));
				uuids = facils.map(f => f.uuid).join(',');
			}

			return uuids;
		}

		async load() {
			try {
				const userUuid = await this.getUserUuids();
				const rsvps = await doApi(api.eventRsvps.getAll({
					query: {
						user: userUuid,
						// type: 'facilitator,co-facilitator',
						private: 1,
					},
				}));
				this.conversations = rsvps.map((rsvp) => {
					// eslint-disable-next-line no-param-reassign
					rsvp.event.facilitator = rsvp.user;
					return rsvp.event;
				});
			} catch (error) {
				this.setState({ loading: false, error })
			}

			this.setConversations();
		}

		isTeam() {
			return this.props.getValues().show === 'team';
		}

		toggleFilter = () => {
			// If we're about to switch to filtered
			this.setState({	filter: !this.state.filter }, this.setConversations);
		}

		render() {
			const now = dayjs();
			const { conversations, filter, loading, error } = this.state;
			const isTeam = this.isTeam();

			if (loading) return <Spinner />;

			return (
				<div className="conversation-list__wrapper list__wrapper">
					{error ? (
						<div className="error">{error.message}</div>
					) : ''}
					{this.conversations.length ? (
						<Button className="list__toggle" onClick={this.toggleFilter}>
							{filter ? 'Show All' : 'Hide Complete' }
						</Button>
					) : ''}
					{conversations.length ? (
						<ul className="conversation-list">
							{conversations.map(conversation => (
								<Conversation
									{...this.props}
									now={now}
									showFacil={isTeam}
									conversation={conversation} />
							))}
						</ul>
					) : (
						<p>You have no {this.conversations.length ? 'upcoming' : ''} conversations</p>
					)}
				</div>
			);
		}
	};
};
