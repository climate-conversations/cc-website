(RaiselyComponents, React) => {
	const { api, Link, Spinner } = RaiselyComponents;
	const { getData } = api;
	const { dayjs } = RaiselyComponents.Common;

	function EventCard(props) {
		const { event } = props;
		const defaultPhoto = 'https://raisely-images.imgix.net/climate-conversations-2019/uploads/conversation-1-jpg-bc7064.jpg';

		const startAt = dayjs(event.startAt);
		const date = startAt.format('dddd, MMMM D');
		const time = startAt.format('h:mm a');

		const photo = event.photoUrl || defaultPhoto;
		const link = event.public.signupUrl || `/events/${event.path}`;

		return (
			<div className="postfeed__item">
				<div className="post post--detail-event post--direction-horizontal">
					<div className="post__image">
						<img src={photo} alt="" />
					</div>
					<div className="post__wrapper">
						<h4 className="post__title"><Link href={link}>{event.name}</Link></h4>
						<div className="post__meta">
							<span className="post__meta__author">
								{date}
							</span>
							<span className="post__meta__date">{time}</span>
							<div className="post__meta__description">
								{event.public.intro}
							</div>
						</div>
						<Link className="button button--primary post__link" href={link} >Sign up</Link>
					</div>
				</div>
			</div>
		);
	}

	return class EventFeed extends React.Component {
		state = { loading: true };

		componentDidMount() {
			this.load()
				.catch((e) => {
					console.error(e);
					this.setState({ loading: false, error: e.message });
				});
		}

		async load() {
			const now = new Date().toISOString();
			const { show } = this.props.getValues();

			const searchKey = show === 'past' ? 'startAtLT' : 'startAtGTE';

			const events = await getData(api.events.getAll({
				query: {
					[searchKey]: now,
				},
			}));

			this.setState({ loading: false, events });
		}

		render() {
			const { events, loading, error } = this.state;

			if (loading) {
				return <Spinner />;
			}

			return (
				<React.Fragment>
					{error ? (
						<div className="error">{error}</div>
					) : ''}
					<ul className="postfeed postfeed--direction-horizontal postfeed--events">
						{events.map(e => <EventCard {...this.props} event={e} />)}
					</ul>
				</React.Fragment>
			);
		}
	};
};
