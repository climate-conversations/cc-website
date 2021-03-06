(RaiselyComponents, React) => {
	const { Link, Spinner, api } = RaiselyComponents;
	const { getQuery } = RaiselyComponents.api;
	const { Icon } = RaiselyComponents.Atoms;
	// eslint-disable-next-line object-curly-newline
	const { dayjs, get, pick, set } = RaiselyComponents.Common;

	const UserSaveHelperRef = RaiselyComponents.import('cc-user-save', { asRaw: true });
	const ReturnButton = RaiselyComponents.import('return-button');
	const ConversationRef = RaiselyComponents.import('conversation', { asRaw: true });
	let Conversation;
	let UserSaveHelper;

	/** NOTE: See the checklist definition below which defines items on the checklist */

	// These functions determine when to mark an item as done
	async function atLeastOneGuest(conversation, rsvps) {
		const hasGuest = !!rsvps.find(r => r.type === 'guest');
		return hasGuest;
	}
	const hasPhoto = conversation => !!get(conversation, 'private.attendeePhotoUrl');
	async function hasReflection(conversation, rsvps) {
		const facilitators = ['facilitator', 'co-facilitator'];
		if (!Conversation) Conversation = ConversationRef().html;
		const reflections = await Conversation.loadReflections({ eventUuid: conversation.uuid });

		const facils = rsvps
			// Find facilitators
			.filter(rsvp => facilitators.includes(rsvp.type));

		const incomplete = facils
			// Check if they've done a reflection
			.filter(rsvp => !reflections.find(r => r.userUuid === rsvp.userUuid));

		// If at least 1 facil is assigned to the conversation
		// and they've all submitted a reflection then we're good
		return (facils.length && !incomplete.length);
	}
	function donationsReported(conversation) {
		return get(conversation, 'private.cashReceived') === false ||
			(get(conversation, 'private.cashTransferReference') &&
			get(conversation, 'private.cashTransferScreenshot') &&
			get(conversation, 'private.cashReportScan'));
	}

	/** CHECKLIST DEFINITION */
	const checklist = [
		{ id: 'check-event', label: 'Check Conversation Details', href: '/conversations/:event/edit' },
		{ id: 'reflection', label: 'Complete a reflection', href: '/conversations/:event/reflection', done: hasReflection },
		{ id: 'donation-report', label: 'Complete Donations Report', href: '/conversations/:event/donations-report', done: donationsReported },
		{ id: 'photo', label: 'Upload Photo', href: '/conversations/:event/photo/upload', done: hasPhoto },
		{ id: 'surveys', label: 'Enter Guest Surveys', href: '/conversations/:event/surveys', done: atLeastOneGuest },
		{ id: 'email-guests', label: 'Email Guests', href: '/conversations/:event/email-guests' },
		{ id: 'host-report', label: 'Send Host Report', href: '/conversations/:event/host-report' },
		{ id: 'destroy-surveys', label: 'Destroy Surveys', href: '/conversations/:event/destroy-surveys' },
	];
	const checklistHelp = {
		'check-event': 'Help us keep good records of who was involved in every event so we can credit everyone',
		reflection: 'Help yourself and your team leader reflect how the conversation went',
		'donation-report': 'Keep accurate records of cash received so we comply with our auditing',
		photo: 'Upload the photo you took from your conversation',
		surveys: 'Enter the survey and CTA details for each guest',
		'email-guests': 'Send an email to the guests to thank them and offer next steps',
		'host-report': 'Send a report to the host to show them the impact of hosting',
		'destroy-surveys': 'Comply with PDPA by properly disposing of the paper surveys',
	};

	function CheckListItem({ item }) {
		// eslint-disable-next-line object-curly-newline
		const { label, isDone, href, help } = item;

		const className = `checklist--item ${isDone ? 'done' : ''}`;

		return (
			<li className={className}>
				<Icon
					name="done"
					href={href}
				/>
				<Link href={href}>{label}</Link>
				{help ? (
					<div className="checklist--item__help">{help}</div>
				) : ''}
			</li>
		);
	}

	return class FacilProcessingChecklist extends React.Component {
		state = { loading: true, checklist };

		componentDidMount() {
			this.load();
		}
		componentDidUpdate() {
			const eventUuid = get(this.props, 'match.params.conversation');
			// Reload the conversation and guests if the id has changed
			if (this.state.eventUuid !== eventUuid) {
				this.setState({ loading: true });
				this.load();
			}
		}

		getCompletedSteps = conversation =>
			get(conversation, 'private.completedSteps', '').split(';').sort();

		/**
		 * Display help hint for just the next item to do
		 */
		setDoNext() {
			let found = false;
			checklist.forEach((item) => {
				if (found || item.isDone) {
					delete item.help;
				} else {
					// eslint-disable-next-line no-param-reassign
					item.help = checklistHelp[item.id];
					found = true;
				}
			});
			this.setState({ checklist });
		}

		setHrefs(uuid) {
			const ReturnButtonClass = ReturnButton();
			if (!ReturnButtonClass) return;
			const { createReturningLink } = ReturnButtonClass.type;

			checklist.forEach((item) => {
				const query = {
					props: this.props,
					url: item.href.replace(':event', uuid),
				};
				// Only set done if there isn't a more difinitive way to set it
				if (!item.done) query.done = item.id;

				// Create links that return to this page with a done flag
				// to manually mark complete steps
				// eslint-disable-next-line no-param-reassign
				item.href = createReturningLink(query);
			});
			this.setState({ checklist });
		}

		setKnownCompletedSteps(eventPromise) {
			// Items can be manually marked done by passing a query of ?done=${item.id}
			const { done } = getQuery(get(this.props, 'router.location.search'));

			eventPromise
				.then((conversation) => {
					const completedSteps = this.getCompletedSteps(conversation);
					checklist.forEach((item) => {
						// eslint-disable-next-line no-param-reassign
						if ((done === item.id) || completedSteps.includes(item.id)) item.isDone = true;
					});
					this.setState({ checklist, conversation });
				})
				.catch(e => this.setState({ error: e.message }));

			this.setDoNext();
		}

		async checkCompletedSteps(conversation, rsvps) {
			const completedSteps = this.getCompletedSteps(conversation);
			// Update any if they are now done
			await Promise.all(checklist.map(async (item) => {
				if (!completedSteps.includes(item.id)) {
					if (item.done) {
						try {
							// eslint-disable-next-line no-param-reassign
							item.isDone = await item.done(conversation, rsvps);

							if (item.isDone) {
								// Update items as they're resolved
								this.setState({ checklist });
							}
						} catch (e) {
							console.error(`Checking done status failed for ${item.id}`, e);
							this.setState({ error: e.message });
						}
					}
				}
			}));
			return completedSteps;
		}

		updateComplete = async (conversation, completedSteps) => {
			// Get a list of now completed steps
			const nowComplete = checklist
				.map(i => (i.isDone ? i.id : null))
				.filter(i => i)
				.sort();

			const stepsDoneNow = nowComplete.join(';');

			const hasChanged = (stepsDoneNow !== completedSteps.join(';'));

			if (hasChanged) {
				set(conversation, 'private.completedSteps', stepsDoneNow);
				const allDone = checklist.reduce((done, i) => (i.isDone && done), true);
				if (allDone) {
					set(conversation, 'private.isProcessed', true);
					set(conversation, 'private.processedAt', new Date().toISOString());
				}
				if (!UserSaveHelper) UserSaveHelper = UserSaveHelperRef().html;
				await UserSaveHelper.proxy(`/events/${conversation.uuid}`, {
					method: 'PATCH',
					body: {
						data: pick(conversation, ['private']),
						partial: true
					}
				});
			}
			this.setDoNext();
			this.setState({ loading: false });
		}

		async load() {
			try {
				const uuid = get(this.props, 'match.params.conversation');
				this.setState({ eventUuid: uuid });

				const isMock = get(this.props, 'global.campaign.mock');
				if (isMock) return this.mockChecklist();

				// Complete the url asap so users can just click through
				// without waiting for async requests to return
				// (as facilitators will come back to this page
				// frequently when processing a conversation)
				this.setHrefs(uuid);

				if (!Conversation) ConversationRef().html;
				const eventPromise = Conversation.loadConversation({ props: this.props, private: 1, required: true });

				this.setKnownCompletedSteps(eventPromise);

				// Fetch rsvps
				const [conversation, rsvpsByType] = await Promise.all([
					eventPromise,
					Conversation.loadRsvps({ props: this.props })
				]);
				const { rsvps } = rsvpsByType;

				const completedSteps = await this.checkCompletedSteps(conversation, rsvps);
				await this.updateComplete(conversation, completedSteps);
			} catch (e) {
				console.error(e);
				this.setState({ error: e.message, loading: false });
			}
		}

		mockChecklist() {
			for (let i = 0; i < checklist.length / 2; i += 1) {
				checklist[i].isDone = true;
			}
			this.setState({
				checklist,
				conversation: {
					name: 'Example Conversation',
					startAt: '2019-07-02',
				},
			});
		}

		render() {
			const { props } = this;
			const { error, loading, conversation } = this.state;
			const startAt = get(conversation, 'startAt');
			const name = get(conversation, 'name', '...');
			if (!Conversation) Conversation = ConversationRef().html;

			const isProcessed = Conversation.isProcessed(conversation);
			const awaitingReview = Conversation.awaitingReview(conversation);
			const displayDate = startAt ? dayjs(startAt).format('DD MMM YYYY') : '';

			return (
				<div className="conversation--checklist__wrapper">
					<h3>{name}</h3>
					<div className="conversation--checklist_subtitle">{displayDate}</div>
					{error ? (
						<div className="cc--error">{error}</div>
					) : ''}
					<ul className="conversation--checklist">
						{checklist.map(item => {
							return (
							<CheckListItem item={item} />
						)})}
					</ul>
					{ isProcessed ? (
						<p>Great work! {"You've"} finished processing this conversation.</p>
					) : '' }
					{ awaitingReview ? (
						<p>Now your conversation will be reviewed by your team leader</p>
					) : '' }
					{loading ? (
						<div className="conversation--checklist__loading">
							Checking for completed steps
							<Spinner className="spinner" />
						</div>
					) : ''}
				</div>
			);
		}
	};
};
