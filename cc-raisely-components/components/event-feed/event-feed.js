(RaiselyComponents, React) => {
	const { api, Link, Spinner } = RaiselyComponents;
	const { getData } = api;
	const { dayjs, get } = RaiselyComponents.Common;

	const EventEditRef = RaiselyComponents.import('event-edit', { asRaw: true });
	let EventEdit;

	function EventCard(props) {
		const { event } = props;
		const defaultPhoto = 'https://raisely-images.imgix.net/climate-conversations-2019/uploads/conversation-1-jpg-bc7064.jpg';

		const { show } = props.getValues();

		if (!EventEdit) EventEdit = EventEditRef().html;

		let date = '';
		let time = '';
		if (event.startAt) {
			const startAt = EventEdit.inSingaporeTime(dayjs(event.startAt));
			date = startAt.format('dddd, MMMM D');
			time = startAt.format('h:mm a');
		}
		const multiDates = get(event, 'public.multiDates');

		const photo = event.photoUrl || defaultPhoto;
		const link = { href: get(event, 'public.signupUrl') };
		if (link.href) {
			link.target = '_blank';
		} else {
			link.href = `/events/${event.path || event.uuid}/view`;
		}
		const edit = `/events/${event.path || event.uuid}/edit`;

		return (
			<div className="postfeed__item">
				<div className="post post--detail-event post--direction-horizontal">
					<div className="post__image">
						<img src={photo} alt="" />
					</div>
					<div className="post__wrapper">
						<h4 className="post__title"><Link {...link}>{event.name}</Link></h4>
						<div className="post__meta">
							{multiDates ? (
								<span className="post__meta__author">
									{multiDates}
								</span>
							) : (
								<React.Fragment>
									<span className="post__meta__author">
										{date}
									</span>
									<span className="post__meta__date">{time}</span>
								</React.Fragment>
							)}
							<div className="post__meta__description">
								{get(event, 'public.intro')}
							</div>
						</div>
						<Link className="button button--cta post__link show--logged-in" href={edit}>Edit</Link>
						{show !== 'past' ? (
							<Link className="button button--primary post__link" {...link}>Sign up</Link>
						) : ''}
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

			console.log(`Event Feed loading (${show})...`);

			try {
				const searchKey = show === 'past' ? 'startAtLT' : 'startAtGTE';

				const events = await getData(api.events.getAll({
					query: { [searchKey]: now },
				}));

				this.setState({ loading: false, events });
				console.log(`Event feed loaded (${show})`, events);
			} catch (e) {
				console.error(e);
				this.setState({ loading: false, error: 'Unable to load events' });
			}
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
