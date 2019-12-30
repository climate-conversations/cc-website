(RaiselyComponents, React) => {
	const { get } = RaiselyComponents.Common;
	const { api, Spinner } = RaiselyComponents;
	const { getData, getQuery } = api;

	const Messenger = RaiselyComponents.import('message-send-and-save');
	const ReturnButton = RaiselyComponents.import('return-button');
	const ConversationRef = RaiselyComponents.import('conversation', { asRaw: true });
	const UserSaveHelperRef = RaiselyComponents.import('cc-user-save', { asRaw: true });
	let UserSaveHelper;
	let Conversation;

	return class ConversationMessageGuests extends React.Component {
		state = { loading: true };

		componentDidMount() {
			this.load();
		}
		load = async () => {
			if (!Conversation) Conversation = ConversationRef().html;
			const { props } = this;
			const campaignUuid = get(this.props, 'global.campaign.uuid');
			if (!UserSaveHelper) UserSaveHelper = UserSaveHelperRef().html;

			const [results, privateCampaign] = await Promise.all([
				Conversation.loadRsvps({ props, type: ['guest'] }),
				UserSaveHelper.proxy(`/campaigns/${campaignUuid}?private=1`, {
					method: 'get',
				})
			]);

			this.setState({ ...results, privateCampaign, loading: false });
		}

		renderInner() {
			const { loading, guests, privateCampaign } = this.state;
			if (loading) {
				return <Spinner />;
			}

			if (!guests.length) {
				return (
					<div className="error">There are no contactable guests in this conversation</div>
				);
			}

			const defaultMessage = 'Thank you for attending the Climate Conversation!';
			const body = get(privateCampaign, 'private.conversationGuestThankyou', defaultMessage);

			const params = {
				...this.props,
				sendBy: 'email',
				body,
				to: guests,
				subject: "Thank you & what's next?",
			};

			return <Messenger {...params} />;
		}

		render() {
			const { props } = this;
			const { error } = this.state;
			return (
				<div className="email--guests__wrapper">
					{error ? <div className="error">{error}</div> : this.renderInner()}
					<ReturnButton {...props} backLabel="Go Back" backTheme="secondary" />
				</div>
			);
		}
	};
};
