(RaiselyComponents, React) => {
	const { dayjs, get } = RaiselyComponents.Common;
	const { api, Spinner } = RaiselyComponents;
	const { Button } = RaiselyComponents.Atoms;
	const { getData } = api;

	const processConversation = conversation => ({
		description: `Let's process ${conversation.name}`,
		link: `/conversations/${conversation.uuid}/process`,
		label: 'Process Conversation',
	});
	const enterHost = () => ({
		description: 'You have no upcoming conversations. Can you think of a host you could reach out to for a conversation?',
		link: '/hosts/create',
		label: 'Add a New Prospect Host',
	});

	return class FacilNextAction extends React.Component {
		state = { loading: true };

		componentDidMount() {
			this.load();
		}

		setAction = () => {
			const action = this.chooseAction();
			this.setState({ action, loading: false });
		}

		load = async () => {
			try {
				const now = dayjs();

				const rsvps = await getData(api.eventRsvps.getAll({
					query: {
						type: 'facilitator',
						private: 1,
						userUuid: get(this, 'props.global.user.uuid'),
					},
				}));

				const conversations = rsvps.map(rsvp => rsvp.event);
				const upcomingConversations = conversations
					.filter(event => dayjs(event.startAt).isAfter(now));
				const overdueConversations = conversations
					.filter(event => dayjs(event.startAt).isBefore(now))
					.filter(event => !get(event, 'private.processedAt'));

				this.setState(
					// eslint-disable-next-line object-curly-newline
					{ rsvps, conversations, upcomingConversations, overdueConversations },
					this.setAction
				);
			} catch (e) {
				console.error(e);
				this.setState({ error: e.message, loading: false });
			}
		}

		chooseAction() {
			const { upcomingConversations, overdueConversations } = this.state;
			if (overdueConversations.length) {
				return processConversation(overdueConversations[0]);
			}
			if (!upcomingConversations.length) {
				return enterHost();
			}
			return false;
		}

		render() {
			const { action, loading, error } = this.state;
			if (loading) return <div className="next--action__wrapper"><Spinner /></div>;
			if (error) {
				return (
					<div className="next--action__wrapper">
						<p className="error">{error}</p>
					</div>
				);
			}
			if (!action) {
				return (
					<div className="next--action__wrapper">
						<p className="next--action__description">Great work! {"You're"} all up to date.</p>
					</div>
				);
			}
			const { description, label, link } = action;
			return (
				<div className="next--action__wrapper">
					<p className="next--action__description">{description}</p>
					<Button theme="cta" href={link}>{label}</Button>
				</div>
			);
		}
	};
};
