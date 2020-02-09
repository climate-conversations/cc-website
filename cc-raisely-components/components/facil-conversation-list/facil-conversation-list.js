(RaiselyComponents, React) => {
	const { Icon, Button } = RaiselyComponents.Atoms;
	const { get, dayjs } = RaiselyComponents.Common;
	const { api, Spinner, Link } = RaiselyComponents;
	const { getData } = api;

	const FacilitatorRef = RaiselyComponents.import('facilitator', { asRaw: true });
	let Facilitator;

	const icons = {
		public: 'public',
		private: 'home',
		corporate: 'work',
		overdue: 'warning',
		inReview: 'check_circle_outline',
	};

	class Conversation extends React.Component {
		setTimes() {
			// eslint-disable-next-line object-curly-newline
			const { cashDonationsNotes, cashTransferAmount, cashReceivedAmount, cashCtaAmount, processAt } = get(this.props, 'conversation.private', {}) || {};

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

			const { conversationType, isProcessed, reviewedAt } = get(conversation, 'private', {}) || {};

			const overdue = this.processOverdue.isBefore(now) && !isProcessed;
			const hasPassed = this.startAt.isBefore(now);

			let iconType = conversationType;
			let tooltip = `${conversationType} conversation`;
			if (hasPassed && !reviewedAt) {
				iconType = 'inReview';
				tooltip = 'To be reviewed by your team leader';
			}
			if (overdue || !this.reconciled) {
				iconType = 'overdue';
				tooltip = overdue ? 'Processing is overdue' : 'Donation amounts do not reconcile';
			}

			const icon = icons[iconType] || icons.private;

			const baseUrl = `/conversations/${conversation.uuid}`;
			let defaultUrl = `${baseUrl}/view`;
			const processUrl = `${baseUrl}/process`;
			const reviewUrl = `${baseUrl}/review`;

			const facilitator = get(conversation, 'facilitator');
			const facilName = get(facilitator, 'fullName') || get(facilitator, 'preferredName') || get(facilitator, 'uuid') || 'unknown';

			if (!hasPassed) defaultUrl = `${baseUrl}/edit`;

			return (
				<li className="conversation-list-item" key={conversation.uuid}>
					<Link className="list__item" href={defaultUrl}>
						<Icon name={icon} title={tooltip} />
						<div className="conversation-name list__item--title">
							{conversation.name}
							<div className="conversation-start list__item--subtitle">{this.displayDate}</div>
							{showFacil ? <div className="conversation-facil">Facil: {facilName}</div> : ''}
						</div>
						{!showFacil && hasPassed && !isProcessed ? (
							<Button className="button-small button-secondary" href={processUrl}>Process</Button>
						) : ''}
						{showFacil && hasPassed ? (
							<Button className="button-small button-secondary" href={reviewUrl}>Review</Button>
						) : ''}
					</Link>
				</li>
			);
		}
	}

	return class FacilConversationList extends React.Component {
		state = { filter: true, loaded: false };

		componentDidMount() {
			this.load();
		}

		setConversations = () => {
			const { allConversations } = this.state;
			const isTeam = this.props.getValues().show === 'team';
			let conversations;
			if (this.state.filter) {
				conversations = allConversations
					.filter(c =>
						isTeam ?
							!get(c, 'private.isReviewed'):
							!get(c, 'private.reviewedAt'));
			}

			this.setState({ conversations, loaded: true });
		}

		async load() {
			try {
				const campaignUuid = this.props.global.uuid;
				let userUuid = await this.getUserUuids();
				// FIXME workaround api bug
				if (userUuid.includes(',')) userUuid = null;
				const conversations = await Facilitator.loadConversations(campaignUuid, userUuid);
				this.setState({ allConversations: conversations }, this.setConversations)
			} catch (error) {
				this.setState({ loaded: true, error })
			}
		}

		async getUserUuids() {
			if (!Facilitator) Facilitator = FacilitatorRef().html;
			const facilitators = await Facilitator.getTeamOrFacilitators(this.props);
			const uuids = facilitators
				.map((f) => {
					// Map it to it's uuid to create the query param
					return f.uuid;
				})
				.join(',');
			return uuids;
		}

		toggleFilter = () => {
			// If we're about to switch to filtered
			this.setState({	filter: !this.state.filter }, this.setConversations);
		}

		render() {
			const now = dayjs();
			const { conversations, filter, loaded, error } = this.state;
			const isTeam = this.props.getValues().show === 'team';

			if (!loaded) return <Spinner />;
			if (error) {
				return (
					<div className="conversation-list__wrapper list__wrapper">
						<div className="error">{error.message || 'Error Loading Conversations'}</div>
					</div>
				);
			}

			return (
				<div className="conversation-list__wrapper list__wrapper">
					{conversations.length ? (
						<Button className="list__toggle" onClick={this.toggleFilter}>
							{filter ? 'Show All' : 'Hide Complete' }
						</Button>
					) : ''}
					{conversations.length ? (
						<ul className="conversation-list">
							{conversations.map(conversation => (
								<Conversation
									key={conversation.uuid}
									{...this.props}
									now={now}
									showFacil={isTeam}
									conversation={conversation} />
							))}
						</ul>
					) : (
						<p>There are no {conversations.length ? 'upcoming' : ''} conversations</p>
					)}
				</div>
			);
		}
	};
};
