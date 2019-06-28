(RaiselyComponents, React) => {
	const DisplayRecord = RaiselyComponents.import('display-record');
	const GuestList = RaiselyComponents.import('conversation-guest-list');

	const { Button } = RaiselyComponents.Atoms;

	const fields = ['event.date', 'event.name', 'event.address1', 'event.address2', 'event.postcode'];

	return class ViewConversation extends React.Component {
		load() {

		}

		render() {
			const { conversation } = this.state;


			return (
				<div className="view-conversation">
					<DisplayRecord event={conversation} fields={fields} />
					<div className="view-conversation__buttons">
						<Button>Process Conversation</Button>
						<Button>Facilitators Reflection</Button>
						<Button>Reconcile Donations</Button>
					</div>
					<div className="view-conversation__guest-list">
						<GuestList conversation={conversation} />
					</div>
				</div>
			);
		}
	};
}
