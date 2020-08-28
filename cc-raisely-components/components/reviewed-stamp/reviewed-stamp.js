(RaiselyComponents) => {
	const { get } = RaiselyComponents.Common;

	const UserSaveHelperRef = RaiselyComponents.import('cc-user-save', { asRaw: true });
	const EventRef = RaiselyComponents.import('event', { asRaw: true });
	let UserSaveHelper;
	let Event;

	return class ReviewStamp extends React.Component {
		state = { loading: false }
		componentDidMount() {
			this.load();
		}
		componentDidUpdate() {
			if (this.props.conversation && (this.state.conversation !== this.props.conversation))
				this.load();
		}

		getType() {
			const validTypes = ['reviewed', 'reconciled'];
			let { type } = this.props;
			return (validTypes.includes(type)) ? type : validTypes[0];
		}

		async load() {
			this.setState({ loading: true });

			const { props } = this;
			let { conversation } = props;
			// Allo caller to force loading
			// If conversation is exactly true, it means we're waiting for parent component to load it
			this.setState({ conversation });
			if (conversation && !Object.keys(conversation).length) return;
			const type = this.getType();
			try {
				if (!UserSaveHelper) UserSaveHelper = UserSaveHelperRef().html;
				let reviewerName;
				if (typeof conversation !== 'object') conversation = await Conversation.loadConversation({ props, private: true });
				let reviewedBy = get(conversation, `private.${type}By`);
				if (reviewedBy) {
					const reviewer = await UserSaveHelper.proxy(`/users/${reviewedBy}?private=1`);
					reviewerName = reviewer.fullName || reviewer.preferredName;
				} else {
					reviewedBy = '(unknown)';
				}

				this.setState({ conversation, reviewerName, loading: false })
			} catch (e) {
				console.error(e);
				this.setState({ error: e.message || 'Unknown error', loading: false })
			}

		}
		renderInner() {
			const type = this.getType();
			const { loading, reviewerName, conversation } = this.state;
			if (loading) return null;
			const reviewedAt = get(conversation, `private.${type}At`);
			if (!Event) Event = EventRef().html;
			let reviewedAtStr;
			if (reviewedAt) reviewedAtStr = Event.inSingaporeTime(reviewedAt).format('YYYY-MM-DD');

			const className = `${type}-statement`;

			return (
				<p className={className}>
					{reviewedAt
						? `This conversation was ${type} by ${reviewerName || '___'} on ${reviewedAtStr}`
						: `This conversation has not been ${type}.`}
				</p>
			);
		}
		render() {
			const type = this.getType();
			const className = `${type}_stamp__wrapper`;
			return (
				<div className={className}>
					{this.renderInner()}
				</div>
			);
		}
	}
}
