(RaiselyComponents, React) => {
	const { displayCurrency, get } = RaiselyComponents.Common;

	const Checkbox = RaiselyComponents.import('checkbox');
	const ReturnButton = RaiselyComponents.import('return-button');
	const WhatsAppButton = RaiselyComponents.import('whatsapp-button');
	const ConversationRef = RaiselyComponents.import('conversation', { asRaw: true });
	let Conversation;

	return class ConversationReview extends React.Component {
		state = { facilitators: [], reflections: [] };
		componentDidMount() {
			this.load();
		}

		async load() {
			try {
				if (!Conversation) Conversation = ConversationRef().html;
				const eventUuid = Conversation.getUuid();
				const conversationPromise = Conversation.loadConversation({ props: this.props, private: true })
					.then(conversation => this.setState({ conversation }));

				const [results, conversation, reflectionsArray] = await Promise.all([
					Conversation.loadRsvps({ props: { eventUuid }, type: ['co-facilitator', 'facilitator', 'guest']}),
					Conversation.updateStatCache(eventUuid),
					Conversation.loadReflections({ eventUuid }),
					conversationPromise,
				]);
				const reflections = {};
				reflectionsArray.forEach(r => reflections[r.userUuid] = r);
				this.setState({ ...results, conversation, reflections, lodaded: true }, this.calculateConversation);
			} catch (e) {
				this.setState({ error: e.message || 'Unknown error', loading: false })
			}
		}

		calculateConversation = async () => {
			const { facilitators } = this.state;
			facilitators.forEach(f => {

			})
		}

		row({ label, values }) {
			return (
				<div key={label} className="data-row">
					<div className="data-field-label">{label}</div>
					{values.map((value, index) => (
						<div key={index} className="data-field-value">{value}</div>
					))}
				</div>
			)
		}

		checkMainStats(placeHolder) {
			const { facilitators, reflections, conversation } = this.state;
			const labels = {
				guests: 'Guests',
				hosts: 'Host Interest',
				facilitators: 'Facil Interest',
			};
			const rows = ['guests', 'hosts', 'faciltiators'].map(key => {
				const eventVal = get(conversation, 'private.statCache.guests', placeHolder);
				let checkText = facilitators
					.map(f => {
						const reflection = reflections[f.uuid];
						const facilName = f.preferredName;

						if (reflection) {
							const facilValue = get(reflection, `detail.private.${key}`, 0);
							if (facilValue === eventVal) return null;

							return `${facilValue} on ${facilName}'s reflection`;
						}
					})
					.filter(n => n)
					.join(', ');
				const label = labels[key];

				return { label, values: [
					eventVal, (
						<span key={key} className="conversation-review__check">({checkText})</span>
					),
				]};
			})
			return rows;
		}

		render() {
			const { facilitators, conversation, loaded } = this.state;
			const placeHolder = loaded ? 0 : 'Loading...'
			let donations = get(conversation, 'private.statCache.donations.totalAmount', placeHolder);
			if (typeof donations !== 'string') donations = displayCurrency(donations);
			const conversationValues = this.checkMainStats(placeHolder);
			const facilitatorValues = [
				{ label: 'Facilitator', values: facilitators.map(f => f.fullName || f.preferredName) },
				{ label: 'Conversation #', values: [] },
				{ label: 'Contact', values: facilitators.map(f => <WhatsAppButton key={f.phoneNumber} phone={f.phoneNumber} />) },
			];
			if (!Conversation) Conversation = ConversationRef().html;
			const isReconciled = Conversation.isReconciled(conversation);

			return (
				<div className="conversation-review">
					{conversationValues.map(row => this.row(row))}
					{this.row({ label: 'Donations', values: [donations] })}
					{facilitatorValues.map(row => this.row(row))}
					{!isReconciled ? (
						<p>You {"can't"} check this box until donation reconciliation is complete</p>
					) : ''}
					<Checkbox
						label='I have reviewied this conversation and it is fully processed'
						disabled={!isReconciled}
					/>
					<ReturnButton {...this.props} saveLabel="Done" />
				</div>
			);
		}
	};
}
