(RaiselyComponents, React) => {
	const { Link, api } = RaiselyComponents;
	const { Icon } = RaiselyComponents.Atoms;

	// These functions determine when to mark an item as done
	async function atLeastOneGuest(conversation) {
		// Fetch rsvps, find one with a survey
	}
	const hasPhoto = conversation => !!conversation.private.photoUrl;
	async function hasReflection(conversation) {
		// Load facils and co-facils
		// Check they have complete reflections
	}
	function donationsReported(conversation) {
		conversation.private.cashReceived === false ||
		conversation.private.cashTransferReference;
	}

	const eventHelp = 'Help us keep good records of who was involved in every event so we can credit everyone';

	const checklist = [
		{ id: 'reflection', label: 'Complete a reflection', href: '/conversations/:event/reflection', done: hasReflection, isDone: true },
		{ id: 'donation-report', label: 'Complete Donations Report', href: '/conversations/:event/donations-report', done: donationsReported },
		{ id: 'photo', label: 'Upload Photo', href: '/conversations/:event/upload-photo', done: hasPhoto },
		{ id: 'check-event', label: 'Check Event Details', href: '/conversations/:event/edit', help: eventHelp },
		{ id: 'surveys', label: 'Enter Guest Surveys', href: '/conversations/:event/guest-survey', done: atLeastOneGuest },
		{ id: 'email-guests', label: 'Email Guests', href: '/conversations/:event/email-guests' },
		{ id: 'host-report', label: 'Send Host Report', href: '/conversations/:event/host-report' },
		{ id: 'destroy-surveys', label: 'Destroy Surveys', href: '/conversations/:event/destroy-surveys' },
	];

	function CheckListItem({ item }) {
		const { label, isDone, href } = item;
		const icon = isDone ? 'done' : 'check-circle-outline';

		return (
			<div>
				<Icon name={icon} href={href} />
				<Link href={href}>{label}</Link>
			</div>
		);
	}

	return class FacilProcessingChecklist extends React.Component {
		componentDidMount() {
			this.load().catch(console.error);
		}

		async load() {
			let records;
			try {
				records = await api.quickLoad({ props: this.props, models: ['event.private'], required: true });
			} catch (e) {
				console.error(e);
				this.setState(e.message);
			}

			const { event: conversation } = records;

			const completedSteps = (conversation.private.completedSteps || '').split(';').sort();

			// Update any if they are now done
			checklist.forEach(async (item) => {
				if (!completedSteps.includes(item.id)) {
					if (item.done) {
						item.isDone = await item.done(conversation);
					}
				} else {
					item.isDone = true;
				}
				// Complete the url
				item.href = item.href.replace(':event', conversation.uuid);
			});

			// Get a list of now completed steps
			const nowComplete = checklist
				.map(i => (i.isDone ? 'id' : null))
				.filter(i => i)
				.sort();

			const stepsDoneNow = nowComplete.join(';');

			const hasChanged = (stepsDoneNow === completedSteps.join(';'));

			if (hasChanged) {
				conversation.private.completedSteps = stepsDoneNow();
				const allDone = checklist.reduce((i, done) => (i.isDone && done), true);
				if (allDone) conversation.private.isProcessed = true;
				// Update API
			}
		}

		render() {
			return checklist.map(item => (
				<CheckListItem item={item} />
			));
		}
	};
};
