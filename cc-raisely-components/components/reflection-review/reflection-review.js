(RaiselyComponents, React) => {
	const { api, Spinner } = RaiselyComponents;
	const { Button } = RaiselyComponents.Atoms;
	const { getData } = api;
	const { get } = RaiselyComponents.Common;

	const Messenger = RaiselyComponents.import('message-send-and-save');
	const ReturnButton = RaiselyComponents.import('return-button');
	const DisplayRecord = RaiselyComponents.import('display-record');
	const ConversationRef = RaiselyComponents.import('conversation', { asRaw: true });
	let Conversation;


	return class ReflectionReview extends React.Component {
		state = { loading: true, index: 0 };

		componentDidMount() {
			this.load();
		}

		load = async () => {
			const { props } = this;
			if (!Conversation) Conversation = ConversationRef().html;

			try {
				const uuid = Conversation.getUuid(props);

				const [conversation, reflections] = await Promise.all([
					Conversation.loadConversation({ props }),
					getData(api.interactions.getAll({
						query: {
							recordUuid: uuid,
							category: 'facilitator-reflection',
							private: 1,
						},
					})),
				]);

				this.setState({ reflections, conversation, loading: false });
			} catch (e) {
				console.error(e);
				this.setState({ error: e.message, loading: false });
			}
		}

		next = (direction = 1) => {
			const { index } = this.state;
			this.setState({ index: index + direction });
		}

		renderReflection(reflection, conversation) {
			const preferredName = get(reflection, 'user.preferredName');

			const message = {
				...this.props,
				sendBy: 'whatsapp',
				body: `Hi ${preferredName}, I saw your reflection ...`,
				to: [reflection.user],
				subject: conversation.name,
				launchButtonLabel: `Send a message to ${preferredName}`,
			};
			const fields = ['interaction.facilitator-reflection.all'];
			const models = ['interaction'];

			return (
				<div className="reflection--review__reflection">
					<DisplayRecord
						{...this.props}
						models={models}
						fields={fields}
						values={{ interaction: reflection }}
					/>
					{ reflection.user ? <Messenger {...message} /> : '' }
				</div>
			);
		}

		render() {
			const { props } = this;
			// eslint-disable-next-line object-curly-newline
			const { conversation, error, index, loading, reflections } = this.state;
			if (loading) return <Spinner />;
			if (error) {
				return (
					<div className="error">{error}</div>
				);
			}

			const reflection = reflections[index];

			return (
				<div className="reflection--review__wrapper">
					{reflection ? (
						<React.Fragment>
							{reflection.user ? (
								<React.Fragment>
									<h2>{`${reflection.user.preferredName}'s`} Reflection</h2>
									<h4>{reflection.user.fullName}</h4>
								</React.Fragment>
							) : (
								<p className="error">{"Something's"} gone wrong, we {"don't"} know who wrote this reflection</p>
							)}
							<h3>{conversation.name}</h3>
							{this.renderReflection(reflection, conversation)}
						</React.Fragment>
					) : (
						<React.Fragment>
							<h3>{conversation.name}</h3>
							<p>There are no reflections for this conversation</p>
						</React.Fragment>
					)}

					<div className="reflection--review__buttons">
						{index === 0 ? (
							<ReturnButton {...props} backLabel="Go Back" />
						) : (
							<Button onCick={() => this.next(-1)}>Previous Reflection</Button>
						)}
						{index < reflections.length - 1 ? (
							<Button onClick={() => this.next()}>Next Reflection</Button>
						) : (
							reflections.length && <ReturnButton {...props} saveTheme="cta" saveLabel="Finished" />
						)}
					</div>
				</div>
			);
		}
	};
};
