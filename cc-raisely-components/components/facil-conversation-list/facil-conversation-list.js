(RaiselyComponents, React) => {
	const { Icon, Button } = RaiselyComponents.Atoms;
	const { get, dayjs } = RaiselyComponents.Common;
	const { Spinner, Link } = RaiselyComponents;
	const Checkbox = RaiselyComponents.import('checkbox');

	const UserSaveHelperRef = RaiselyComponents.import('cc-user-save', {
		asRaw: true,
	});

	const FacilitatorRef = RaiselyComponents.import('facilitator', {
		asRaw: true,
	});
	let Facilitator;
	const EventRef = RaiselyComponents.import('event', { asRaw: true });
	let Event;
	let UserSaveHelper;

	const icons = {
		public: 'public',
		private: 'home',
		corporate: 'work',
		overdue: 'warning',
		reconcileIssue: 'money_off',
		awaitingReview: 'access_time',
		readyForReview: 'assignment',
	};

	class Conversation extends React.Component {
		setTimes() {
			const { conversation } = this.props;

			// eslint-disable-next-line object-curly-newline
			const {
				cashDonationsNotes,
				cashTransferAmount,
				cashReceivedAmount,
				cashCtaAmount,
				processAt,
			} = get(this.props, 'conversation.private', {}) || {};

			const startAt = get(this.props, 'conversation.startAt');

			this.startAt = dayjs(startAt);
			this.processOverdue = dayjs(processAt || startAt).add(1, 'day');
			if (!Event) Event = EventRef().html;
			this.displayDate = Event.displayDate(conversation);

			this.reconciled =
				cashDonationsNotes ||
				(cashTransferAmount === cashReceivedAmount &&
					cashTransferAmount === cashCtaAmount);
		}

		markCheckbox = () => {
			const { conversation, setSelectedConversations } = this.props;
			setSelectedConversations(conversation);
		};

		render() {
			if (!this.startAt) this.setTimes();

			const { now, conversation, showFacil, showCheckbox } = this.props;

			const { conversationType, isProcessed, reviewedAt } =
				get(conversation, 'private', {}) || {};
			const isTeam = this.props.getValues().show === 'team';

			const overdue = this.processOverdue.isBefore(now) && !isProcessed;
			const hasPassed = this.startAt.isBefore(now);

			let iconType = conversationType;
			let tooltip = `${conversationType} conversation`;
			if (overdue) {
				iconType = 'overdue';
				tooltip = overdue
					? 'Processing is overdue'
					: 'Donation amounts do not reconcile';
			} else if (isProcessed && !this.reconciled) {
				iconType = 'reconcileIssue';
				tooltip = 'Donation amounts do not reconcile';
			} else if (isProcessed && !reviewedAt) {
				iconType = isTeam ? 'readyForReview' : 'awaitingReview';
				tooltip = isTeam
					? 'Ready for review'
					: 'To be reviewed by your team leader';
			}

			const icon = icons[iconType] || icons.private;

			const baseUrl = `/conversations/${conversation.uuid}`;
			let defaultUrl = `${baseUrl}/view`;
			const processUrl = `${baseUrl}/process`;
			const reviewUrl = `${baseUrl}/review`;

			const facilitator = get(conversation, 'facilitator');
			const facilName =
				get(facilitator, 'fullName') ||
				get(facilitator, 'preferredName') ||
				get(facilitator, 'uuid') ||
				'unknown';

			if (!hasPassed) defaultUrl = `${baseUrl}/edit`;

			return (
				<li className="conversation-list-item" key={conversation.uuid}>
					<Link
						className="list__item"
						href={defaultUrl}
						title={tooltip}
					>
						<Icon name={icon} title={tooltip} />
						<div className="conversation-name list__item--title">
							{conversation.name}
							<div className="conversation-start list__item--subtitle">
								{this.displayDate}
							</div>
							{showFacil ? (
								<div className="conversation-facil">
									Facil: {facilName}
								</div>
							) : (
								''
							)}
						</div>
						{!showFacil && hasPassed && !isProcessed ? (
							<Button
								className="button-small button-secondary"
								href={processUrl}
							>
								Process
							</Button>
						) : (
							''
						)}
						{showFacil && hasPassed ? (
							<Button
								className="button-small button-secondary"
								href={reviewUrl}
							>
								Review
							</Button>
						) : (
							''
						)}
					</Link>
					{showCheckbox && (
						<Checkbox
							onChange={this.markCheckbox}
							value={this.props.isSelected}
						/>
					)}
				</li>
			);
		}
	}

	return class FacilConversationList extends React.Component {
		state = {
			filter: true,
			loaded: false,
			showCheckbox: false,
			disableCheckbox: false,
			selectedConversations: [],
		};

		componentDidMount() {
			this.load();
		}
		componentDidUpdate() {
			if (!Facilitator) Facilitator = FacilitatorRef().html;
			const reloadKey = Facilitator.getTeamOrFacilUniqueKey(this.props);

			// Reload the conversation and guests if the id has changed
			if (reloadKey !== this.state.reloadKey) {
				this.setState({ loading: true });
				this.load();
			}
			console.log(
				'selectedConversations: ',
				this.state.selectedConversations
			);
		}

		setConversations = () => {
			const { allConversations } = this.state;
			const isTeam = this.props.getValues().show === 'team';
			let conversations = allConversations;
			if (this.state.filter) {
				conversations = allConversations.filter(
					(c) => !get(c, 'private.reviewedAt')
				);
			}

			this.setState({ conversations, loaded: true });
		};

		async load() {
			try {
				const campaignUuid = this.props.global.uuid;
				let userUuid = await this.getUserUuids();
				const conversations = await Facilitator.loadConversations(
					campaignUuid,
					userUuid
				);
				this.setState(
					{ allConversations: conversations },
					this.setConversations
				);
			} catch (error) {
				console.error(error);
				this.setState({ loaded: true, error });
			}
		}

		async getUserUuids() {
			if (!Facilitator) Facilitator = FacilitatorRef().html;
			const reloadKey = Facilitator.getTeamOrFacilUniqueKey(this.props);
			this.setState({ reloadKey });

			const facilitators = await Facilitator.getTeamOrFacilitators(
				this.props
			);
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
			this.setState(
				{ filter: !this.state.filter },
				this.setConversations
			);
		};

		toggleSelectConversations = () => {
			//If we want to select duplicates to mergE
			this.setState({
				showCheckbox: !this.state.showCheckbox,
			});
		};

		setSelectedConversations = (conversation) => {
			const { selectedConversations } = this.state;

			let newSelected;

			if (selectedConversations.includes(conversation.uuid)) {
				newSelected = selectedConversations.filter(
					(uuid) => uuid !== conversation.uuid
				);
			} else {
				newSelected = [...selectedConversations, conversation.uuid];
			}

			this.setState({ selectedConversations: newSelected });
		};

		mergeConversations = async () => {
			const { selectedConversations } = this.state;

			if (selectedConversations.length !== 2) return;

			// insert cloud function here
			if (!UserSaveHelper) UserSaveHelper = UserSaveHelperRef().html;

			let conversation1uuid = selectedConversations[0];
			let conversation2uuid = selectedConversations[1];
			console.log(conversation1uuid);
			try {
				let data = await UserSaveHelper.mergeConversations(
					conversation1uuid,
					conversation2uuid
				);
				console.log('response data:', data);
			} catch (err) {
				console.log(err);
			}
		};

		render() {
			const now = dayjs();
			const {
				conversations,
				filter,
				loaded,
				error,
				selectedConversations,
				showCheckbox,
			} = this.state;
			const isTeam = this.props.getValues().show === 'team';

			if (!loaded) return <Spinner />;
			if (error) {
				return (
					<div className="conversation-list__wrapper list__wrapper">
						<div className="error">
							{error.message || 'Error Loading Conversations'}
						</div>
					</div>
				);
			}
			return (
				<div className="conversation-list__wrapper list__wrapper">
					{conversations.length ? (
						<>
							<Button
								className="list__toggle"
								onClick={this.toggleFilter}
							>
								{filter ? 'Show All' : 'Hide Complete'}
							</Button>
							<Button
								className="list__toggle"
								onClick={this.toggleSelectConversations}
							>
								{this.state.showCheckbox
									? 'Unselect duplications'
									: 'Select duplications'}
							</Button>
							{selectedConversations.length === 2 && (
								<Button
									className="list__toggle"
									onClick={this.mergeConversations}
								>
									Merge
								</Button>
							)}

							{this.state.showCheckbox && (
								<p>
									Please select <em>exactly 2</em>{' '}
									conversations to merge.
								</p>
							)}
						</>
					) : (
						''
					)}
					{conversations.length ? (
						<ul className="conversation-list">
							{conversations.map((conversation) => (
								<Conversation
									key={conversation.uuid}
									{...this.props}
									now={now}
									showFacil={isTeam}
									conversation={conversation}
									isSelected={selectedConversations.includes(
										conversation.uuid
									)}
									showCheckbox={showCheckbox}
									setSelectedConversations={
										this.setSelectedConversations
									}
								/>
							))}
						</ul>
					) : (
						<p>
							There are no{' '}
							{conversations.length ? 'upcoming' : ''}{' '}
							conversations
						</p>
					)}
				</div>
			);
		}
	};
};
