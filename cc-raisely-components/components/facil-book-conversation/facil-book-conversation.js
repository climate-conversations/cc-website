(RaiselyComponents) => class FacilBookConversation extends React.Component {
	generateForm() {
		const fields = ['event.startAt', 'event.processAt', 'event.address1', 'event.address2',
			'event.city', 'event.state', 'event.postcode'];

		const multiFormConfig = [
			{ title: 'Conversation Details', fields: fields },
			{ title: 'People Involved', component: conversationTeam },
		];
	
		return multiFormConfig;
	}

	async load() {
		// Load event data
		// Default city to Singapore (set in admin)
	}

	async save({ fields, step }) {
		// Upsert event
		// Calculate difference in RSVPs
		// Add new rsvps
		// Delete old rsvps (careful not remove guests)
	}

	render() {
		const config = this.generateForm();
		return (<Form
			config={config}
			controller={this}
			saveEachStep="true"
			saveMessage="Saving Conversation"			
			/>
		);
	}
}