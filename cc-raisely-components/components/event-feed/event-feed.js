(RaiselyComponents, React) => {
	const { api, Link } = RaiselyComponents;

	function EventCard(props) {
		const event = {
			name: 'Demo Event',
			shortDescription: `Come to this event! It's cool. There'll be this person speaking, and that person doing a skill share.`,
			startAt: 'Monday, 27th September',
			startTime: '7:30pm',
			link: '/events/:uuid',
			photoUrl: 'https://raisely-images.imgix.net/climate-conversations-2019/uploads/conversation-1-jpg-bc7064.jpg',
		};

		// Just so it doesnn't look completely awful, feel free to delete
		const style = { maxWidth: '50px' };

		return (
			<div className="event--card__wrapper">
				<h3 className="event-card__name">{event.name}</h3>
				<div className="event-card__date">
					{event.startAt}
					<span className="event-card__time">{event.startTime}</span>
				</div>
				<Link href={event.link} />
				<div className="event--card__description">{event.description}</div>
				<img style={style} className="event--card__photo" src={event.photoUrl} alt="" />
			</div>
		);
	}

	return class EventFeed extends React.Component {
		componentDidMount() {

		}

		render() {
			const values = this.props.getValues();
			const events = [1, 2, 3];
			return (
				<ul className="event--feed__wrapper">
					{events.map(e => <EventCard {...this.props} event={e} />)}
				</ul>
			);
		}
	};
};
