(RaiselyComponents, React) => {
	const { Link, Spinner, api } = RaiselyComponents;
	const { getData, getQuery } = RaiselyComponents.api;
	const { Icon } = RaiselyComponents.Atoms;
	// eslint-disable-next-line object-curly-newline
	const { dayjs, get, pick, set } = RaiselyComponents.Common;

	const ReturnButton = RaiselyComponents.import('return-button');
	const ConversationRef = RaiselyComponents.import('conversation', { asRaw: true });
	let Conversation;
	const EventRef = RaiselyComponents.import("event", {
		asRaw: true
	}); ;
	let Event;

	/** NOTE: See the checklist definition below which defines items on the checklist */

	// These functions determine when to mark an item as done
	async function atLeastOneGuest(conversation, rsvps) {
		const hasGuest = !!rsvps.guests.length;
		return hasGuest;
	}
	async function hasReflection(conversation, rsvps) {
		const facilitators = ['facilitator', 'co-facilitator'];
		const reflections = await getData(api.interactions.getAll({
			query: {
				reference: conversation.uuid,
				category: 'facilitator-reflection',
			},
		}));

		const facils = rsvps.facilitators.concat(rsvps['co-facilitators']);

		const complete = facils
			// Check if they've done a reflection
			.filter(rsvp => reflections.find(r => r.user.uuid === rsvp.uuid));

		// If at least 1 facil is assigned to the conversation
		// and they've all submitted a reflection then we're good
		return (facils.length && complete.length);
	}
	function donationsReported(conversation) {
		return get(conversation, 'private.cashReceived') === false ||
			(get(conversation, 'private.cashTransferReference') &&
			get(conversation, 'private.cashTransferScreenshot') &&
			get(conversation, 'private.cashReportScan'));
	}
	const donationsReconciled = (conversation) =>
		!!get(conversation, 'private.reconciledAt');
	const conversationReviewed = conversation =>
		!!get(conversation, 'private.reviewedAt');

	/** CHECKLIST DEFINITION */
	const checklist = [
		{ id: 'review-reflection', label: 'Review facilitators Reflection', href: '/conversations/:event/reflections/view', enable: hasReflection },
		{ id: 'donation-review', label: 'Review Cash Donations', href: '/conversations/:event/reconcile-donations', enable: donationsReported, done: donationsReconciled },
		{ id: 'review-stats', label: 'Review Conversation Outcomes', href: '/conversations/:event/outcomes', enable: atLeastOneGuest, done: conversationReviewed },
	];
	const checklistHelp = {
		'review-reflection': 'Check and see how your facilitator is feeling about the conversation and if you need to get in touch',
		'donation-review': 'Help us keep good records of our cash donations by checking the report submitted',
		'review-stats': 'See what the facilitator achieved in this conversation',
	};
	const checklistDisabled = {
		'review-reflection': 'Facilitator has not completed their reflection yet',
		'donation-review': 'Facilitator has not entered donations yet',
		'review-stats': 'Facilitator has not entered any guest details yet',
	}

	function CheckListItem({ item }) {
		// eslint-disable-next-line object-curly-newline
		const { label, isDone, href, help, isEnabled, id } = item;

		const className = `checklist--item ${isDone ? 'done' : ''} ${isEnabled ? '' : 'disabled'}`;

		const helpText = isEnabled ? help : checklistDisabled[id];

		return (
			<li className={className}>
				<Icon
					name="done"
					href={href}
				/>
				<Link href={href}>{label}</Link>
				{helpText ? (
					<div className="checklist--item__help">{helpText}</div>
				) : ''}
			</li>
		);
	}

	return class TeamLeaderProcessingChecklist extends React.Component {
		state = { loading: true, checklist };

		// eslint-disable-next-line consistent-return
		componentDidMount() {
			const isMock = get(this.props, 'global.campaign.mock');

			if (isMock) return this.mockChecklist();

			this.load();
		}
		componentDidUpdate() {
			const eventUuid = get(this.props, 'match.params.conversation');

			if (eventUuid !== this.state.eventUuid) {
				this.setState({ loading: true });
				this.load();
			}
		}

		getCompletedSteps = conversation =>
			get(conversation, 'private.ftlCompletedSteps', '').split(';').sort();

		/**
		 * Display help hint for just the next item to do
		 */
		setDoNext() {
			let found = false;
			checklist.forEach((item) => {
				if (found || item.isDone) {
					delete checklist.help;
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
				.then(({ event: conversation }) => {
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
			const enabledSteps = [];
			// Update any if they are now done
			await Promise.all(checklist.map(async (item) => {
				if (!completedSteps.includes(item.id)) {
					if (item.enable) {
						// eslint-disable-next-line no-param-reassign
						item.isEnabled = await item.enable(conversation, rsvps);
					}
					if (item.isEnabled || !item.enable) enabledSteps.push(item.id);
					if (item.done) {
						try {
							// eslint-disable-next-line no-param-reassign
							item.isDone = item.isEnabled && await item.done(conversation, rsvps);

							if (item.isDone) {
								// Update items as they're resolved
								this.setState({ checklist });
							}
						} catch (e) {
							console.error(`Checking done status failed for ${item.id}`, e);
							this.setState({ error: e.message || 'Unknown error' });
						}
					}
				}
			}));
			this.setState({ enabledSteps: enabledSteps.join(',') });
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

			const allDone = checklist.reduce((done, i) => (i.isDone && done), true);
			if (hasChanged) {
				set(conversation, 'private.ftlCompletedSteps', stepsDoneNow);
				await getData(api.events.update({
					id: conversation.uuid,
					data: { data: { private: { ftlCompletedSteps: stepsDoneNow } } },
				}));
			}
			this.setDoNext();
			this.setState({ loading: false, allDone });
		}

		async load() {
			try {
				const uuid = get(this.props, 'match.params.conversation');
				this.setState({ eventUuid: uuid });

				// Complete the url asap so users can just click through
				// without waiting for async requests to return
				// (as facilitators will come back to this page
				// frequently when processing a conversation)
				this.setHrefs(uuid);

				const eventPromise = Conversation.loadConversation({ props: this.props, required: true, private: 1 });

				this.setKnownCompletedSteps(eventPromise);

				// Fetch rsvps
				const [conversation, rsvps] = await Promise.all([
					eventPromise,
					Conversation.loadRsvps({ props: this.props, type: ['facilitator', 'co-facilitator', 'guest'] }),
				]);

				const completedSteps = await this.checkCompletedSteps(conversation, rsvps);
				this.setState({ conversation });
				await this.updateComplete(conversation, completedSteps);
			} catch (e) {
				console.error(e);
				this.setState({ error: e.message || 'Unknown error', loading: false });
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
			if (!Conversation) Conversation = ConversationRef().html;

			const { error, loading, conversation } = this.state;
			const name = get(conversation, 'name', '...');

			const isReviewed = Conversation.isReviewed(conversation);
			if (!Event) Event = EventRef().html;
			const startAt = Event.inSingaporeTime(
				dayjs(get(conversation, 'startAt'))
			);
			const displayDate = startAt ? startAt.format('D MMM YYYY') : '';

			return (
				<div className="conversation--checklist__wrapper">
					<h3>{name}</h3>
					<div className="conversation--checklist_subtitle">{displayDate}</div>
					{error ? (
						<div className="cc--error">{error}</div>
					) : ''}
					<ul className="conversation--checklist">
						{checklist.map(item => (
							<CheckListItem key={item.id} item={item} />
						))}
					</ul>
					{ isReviewed ? (
						<p>Greate work! Thanks for helping to keep our record keeping accurate</p>
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
