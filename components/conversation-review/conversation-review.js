(RaiselyComponents, React) => {
	const { displayCurrency, get } = RaiselyComponents.Common;
	const { Spinner } = RaiselyComponents;

	const Checkbox = RaiselyComponents.import('checkbox');
	const ReviewStamp = RaiselyComponents.import("reviewed-stamp");
	const ReturnButton = RaiselyComponents.import('return-button');
	const WhatsAppButton = RaiselyComponents.import('whatsapp-button');
	const ConversationRef = RaiselyComponents.import('conversation', { asRaw: true });
	const UserSaveHelperRef = RaiselyComponents.import('cc-user-save', { asRaw: true });
	let Conversation;
	let UserSaveHelper;

	return class ConversationReview extends React.Component {
		state = { facilitators: [], reflections: [] };
		componentDidMount() {
			this.setState({ loading: true });
			this.load();
		}
		componentDidUpdate() {
			if (!Conversation) Conversation = ConversationRef().html;
			const eventUuid = Conversation.getUuid(this.props);
			// Reload the conversation and guests if the id has changed
			if (eventUuid !== this.state.eventUuid) {
				this.setState({ loading: true });
				this.load();
			}
		}
		async countFacilConversations(user) {
			const results = await Conversation.loadRsvps({
				query: {
						type: 'facilitator,co-facilitator',
						user: user.uuid,
						['event.startAtLT']: new Date().toISOString(),
					},
				});
			return {
				uuid: user.uuid,
				count: results.rsvps.length,
			}
		}

		async load() {
			const { props } = this;
			try {
				if (!Conversation) Conversation = ConversationRef().html;
				const eventUuid = Conversation.getUuid(this.props);
				this.setState({ eventUuid });

				const [results, conversation, reflectionsArray] = await Promise.all([
					Conversation.loadRsvps({ props: { eventUuid }, type: ['co-facilitator', 'facilitator', 'guest']}),
					Conversation.updateStatCache({ props, eventUuid }),
					Conversation.loadReflections({ eventUuid }),
				]);
				const allFacils = results.facilitators.concat(results['co-facilitators']);
				console.log('results', results, allFacils)
				const conversationCountPromises = allFacils.map(facil => this.countFacilConversations(facil));

				const reflections = {};
				reflectionsArray.forEach(r => reflections[r.userUuid] = r);
				this.setState({ ...results, conversation, reflections, loading: false }, this.calculateConversation);

				const conversationCounts = await Promise.all(conversationCountPromises);
				const facilConversations = {};
				conversationCounts.forEach(c => facilConversations[c.uuid] = c.count);
				this.setState({ facilConversations });
			} catch (e) {
				console.error(e);
				this.setState({ error: e.message || 'Unknown error', loading: false })
			}
		}

		row({ label, values, space, line }) {
			let rowClass = `data-row`;
			if (space) rowClass += ' space';
			if (line) rowClass += ' line';
			return (
				<div key={label} className={rowClass}>
					<div className="data-field-label">{label}</div>
					{values.map((value, index) => (
						<div key={index} className="data-field-value">{value}</div>
					))}
				</div>
			);
		}

		markReviewComplete = async () => {
			const { conversation } = this.state;
			this.setState({ saving: true });
			try {
				const reviewSettings = {
					reviewedBy: get(this.props, 'global.user.uuid'),
					reviewedAt: new Date().toISOString(),
				};
				Object.assign(conversation.private, reviewSettings);
				if (!UserSaveHelper) UserSaveHelper = UserSaveHelperRef().html;
				await UserSaveHelper.proxy(`/events/${conversation.uuid}`, {
					method: 'PATCH',
					body: {
						data: { private: reviewSettings },
						partial: true,
					}
				});
				this.setState({ saving: false });
			} catch (e) {
				console.error(e);
				this.setState({ error: e.message || 'Unknown error', saving: false })
			}
		}

		checkMainStats(placeHolder) {
			const { facilitators, reflections, conversation } = this.state;
			const labels = {
				guests: 'Guests',
				hosts: 'Host Interest',
				facilitators: 'Facil Interest',
			};
			const rows = ['guests', 'hosts', 'facilitators'].map(key => {
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
				if (checkText.length) checkText = `(${checkText})`;

				return { label, values: [
					eventVal, (
						<span key={key} className="conversation-review__check">{checkText}</span>
					),
				]};
			})
			return rows;
		}

		render() {
			const { facilitators, conversation, loading, error, saving } = this.state;
			const facilConversations = this.state.facilConversations || {};
			const placeHolder = loading ? ' ' : 0;

			const totalDonations = get(conversation, 'private.statCache.donations.total', placeHolder);
			const onlineDonations = get(conversation, 'private.statCache.donations.online', placeHolder);
			const cashDonations = get(conversation, 'private.statCache.donations.cash', placeHolder);
			let donationValues = [cashDonations, onlineDonations, totalDonations]
			donationValues = donationValues.map((d, i) => {
				const val = displayCurrency(d, 'SGD');
				const label = ['cash (reported)', 'online', 'total'];
				return `${val} ${label[i]}`;
			});

			const conversationValues = this.checkMainStats(placeHolder);
			const facilitatorValues = [
				{ label: '', values: facilitators.map(f => f.fullName || f.preferredName) },
				{ label: 'Conversations', values: facilitators.map(f => facilConversations[f.uuid] ) },
				{ label: 'Contact', values: facilitators.map(f => <WhatsAppButton key={f.phoneNumber} phone={f.phoneNumber} />) },
			];
			if (!Conversation) Conversation = ConversationRef().html;
			const isReconciled = Conversation.isReconciled(conversation);

			if (error) {
				return <div className="error"><p>There was an error loading</p></div>;
			}

			const { reviewedAt } = get(conversation, 'private', {});

			return (
				<div className="conversation-review">
					<h3>{get(conversation, 'name', '')}</h3>
					{loading ? <Spinner/ > : (
						<div className="conversation-review__data">
							{conversationValues.map((row, i) => this.row({ ...row, lines: true }))}
							{this.row({ label: 'Donations', values: donationValues, space: true })}
							<h4>Facilitators</h4>
							{facilitatorValues.map(row => this.row(row))}
						</div>
					)}
					<div className="conversation-review__checkbox">
						{saving ? (
							<Spinner />
						) : (
							<React.Fragment>
								{reviewedAt ? (
									<ReviewStamp conversation={conversation} />
								) : (
									<React.Fragment>
										{!isReconciled ? (
											<p>You {"can't"} check this box until donation reconciliation is complete</p>
										) : ''}
										<Checkbox
											label='I have reviewied this conversation and it is fully processed'
											disabled={!(isReconciled || !loading)}
											onChange={this.markReviewComplete}
										/>
									</React.Fragment>
								)}
							</React.Fragment>
						)}
					</div>
					<ReturnButton {...this.props} backLabel={reviewedAt ? 'Go Back' : 'Done'} />
				</div>
			);
		}
	};
}
