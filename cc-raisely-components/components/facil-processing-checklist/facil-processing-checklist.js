(RaiselyComponents, React) => {
	const { Icon } = RaiselyComponents.Atoms;

	// These functions determine when to mark an item as done
	async function atLeastOneGuest(conversation) {
		// Fetch rsvps, find one with a survey
	}
	const hasPhoto = (conversation) => !!conversation.private.photoUrl;
	async function hasReflection(conversation) {
		// Load facils and co-facils
		// Check they have complete reflections
	}
	function donationsReported(conversation) {
		conversation.private.wereDonationsReceived === false ||
		conversations.private.cashTransferReference
	}

	const cashReport = ['event.wereDonationsReceived', 'event.cashReceived', 'event.reportScan'];
	const transferReport = ['event.transferScreenshot', 'event.cashTransferredAt', 'event.cashTransferReference'];

	const checklist = [
		{ id: 'reflection', label: 'Complete a reflection', href: '/conversations/reflection', done: hasReflection },
		{ id: 'donation-report', label: 'Complete Donations Report', href: '/conversations/donations-report', done: donationsReported },
		{ id: 'photo', label: 'Upload Photo', href: '/conversations/upload-photo', done: hasPhoto },
		{ id: 'surveys', label: 'Enter Guest Surveys', href: '/conversations/guest-survey', done: atLeastOneGuest },
		{ id: 'email-guests', label: 'Email Guests', href: '/conversations/email-guests' },
		{ id: 'host-report', label: 'Send Host Report', href: '/conversations/host-report' },
		{ id: 'destroy-surveys', label: 'Destroy Surveys', href: '/conversations/destroy-surveys' },
	]

	class ChecklistItem extends React.Component {
		render() {
			const { label, isDone, href } = this.props.item;
			const icon = isDone ? 'done' : 'check-circle-outline';

			return (
				<div>
					<Icon name={icon} href={href} />
					<Link href={link}>{label}</Link>
				</div>
			);
		}
	}

	return class FacilProcessingChecklist extends React.Component {
		componentDidMount() {
			// Fetch the conversation
			// For each checklist, figure out if it's done
			// update conversation.private.processChecklist
			// update conversation.private.isProcessed
		}

		render() {
			const values = this.props.getValues();
			return checklist.map(item => (
				<CheckListItem item={item} />
			));
		}
	}
}
