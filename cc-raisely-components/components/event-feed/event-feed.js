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

		// Just so it doesnn't look completely awful, feel free to delete
		const style = { maxWidth: '200px' };

		return (
			<div className="event--card__wrapper">
				<h3 className="event-card__name">{event.name}</h3>
				<div className="event-card__date">
					{date}
					<span className="event-card__time">{time}</span>
				</div>
				<Link href={link} >Sign up</Link>
				<div className="event--card__description">{event.public.shortDescription}</div>
				<img style={style} className="event--card__photo" src={photo} alt="" />
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
					<ul className="event--feed__wrapper">
						{events.map(e => <EventCard {...this.props} event={e} />)}
					</ul>
				</React.Fragment>
			);
		}
	};
};
