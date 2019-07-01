(RaiselyComponents, React) => {
	const DisplayRecord = RaiselyComponents.import('display-record');
	const GuestList = RaiselyComponents.import('conversation-guest-list');

	const { Button } = RaiselyComponents.Atoms;

	const fields = ['event.date', 'event.name', 'event.address1', 'event.address2', 'event.postcode'];

	return class ViewConversation extends React.Component {
		componentDidMount() {
			this.load();
		}

		async load() {
			this.setState({ loading: true });
			try {
				const data = await quickLoad({ models: ['event'], required: true, props: this.props });
				this.setState({ conversation: data.event });
			} catch (e) {
				this.setState({ error: e.message });
				console.error(e);
			} finally {
				this.setState({ loading: false });
			}
		}

		render() {
			const { conversation, loading, error } = this.state;

			if (loading) {
				return <Spinner />;
			}
			if (error) {
				return (
					<div className="view-conversation">
						<div class="view-converasation-error">Error: {error}</div>
					</div>
				);
			}

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
};
