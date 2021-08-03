(RaiselyComponents, React) => {
	const { dayjs, get } = RaiselyComponents.Common;
	const { api, Spinner } = RaiselyComponents;
	const { Button } = RaiselyComponents.Atoms;

	const UserSaveHelperRef = RaiselyComponents.import('cc-user-save', { asRaw: true });
	let UserSaveHelper;

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

				if (!UserSaveHelper) UserSaveHelper = UserSaveHelperRef().html;
				const rsvps = await UserSaveHelper.proxy('/event_rsvps', {
					query: {
						type: 'facilitator',
						private: 1,
						user: get(this, 'props.global.user.uuid'),
						// Show oldest first
						order: 'ASC',
					},
				});

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
			const isAdmin = get(this.props, 'global.user.isAdmin');
			if (loading) return <div className="next--action__wrapper"><Spinner /></div>;
			if (!isAdmin) {
				return (
					<div className="next--action__wrapper">
						<p className="error">{`There's`} a problem with your user account. Parts of your dashboard will not work. Please contact an administrator (Error: user is not an admin)</p>
					</div>
				)
			}
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
