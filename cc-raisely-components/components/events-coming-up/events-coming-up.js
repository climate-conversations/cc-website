(RaiselyComponents, React) => {
	const { api, Link, Spinner } = RaiselyComponents;
	const { getData } = api;
	const { get } = RaiselyComponents.Common;

	const EventCardRef = RaiselyComponents.import('event-card', { asRaw: true });
	let EventCard;

	const DEFAULT_CATEGORIES = [
		{
			type: 'other',
			fallbackTitle: 'Join our next event',
			fallbackLink: '/events',
			fallbackPhotoUrl: 'https://raisely-images.imgix.net/climate-conversations-2019/uploads/corporate-jpg-258292.jpg',
		},
	];

	function Fallback({ event }) {
		const { title, link, photoUrl } = event;

		return (
			<div className="postfeed__item">
				<div className="post post--detail-event post--direction-horizontal">
					<div className="post__image">
						<img src={photoUrl} alt="" />
					</div>
					<div className="post__wrapper">
						<h4 className="post__title"><Link href={link}>{title}</Link></h4>
					</div>
				</div>
			</div>
		);
	}

	return class EventsComingUp extends React.Component {
		state = { loading: true };

		componentDidMount() {
			this.load()
				.catch((e) => {
					console.error(e);
					this.setState({ loading: false, error: e.message });
				});
		}


		getCategories() {
			let { categories } = this.props.getValues();
			if (!categories) categories = DEFAULT_CATEGORIES;
			// What categories are being shown
			const allCategories = categories
				.map(c => c.type)
				.filter(t => !['other', ''].includes(t));
			// Prevent errors from an empty notIn query
			if (!allCategories.length) allCategories.push('dummy');
			// Any category for other, find everythnig that isn't the selected categories
			return categories
				.map(category => ({
					...category,
					type: category.type === 'other' ? allCategories : category.type,
				}));
		}

		async load() {
			try {
				const now = new Date().toISOString();
				const categories = this.getCategories();
				this.setState({ categories });
				console.log('Loading upcoming events...`', categories);
				const { global } = this.props;

				let events = await Promise.all(categories.map(async (category) => {
					let { type } = category;
					const typeKey = Array.isArray(type) ?
						'eventTypeNotin' : 'eventType';
					if (Array.isArray(type)) type = JSON.stringify(type);

					const [event] = await getData(api.events.getAll({
						query: {
							startAtGTE: now,
							sort: 'startAt',
							order: 'ASC',
							[typeKey]: type,
							'public.canRsvp': true,
							limit: 1,
							campaign: get(global, 'campaign.uuid'),
						},
					}));

					if (!event && category.fallbackTitle) {
						return {
							isFallback: true,
							title: category.fallbackTitle,
							link: category.fallbackLink,
							photoUrl: category.fallbackPhotoUrl,
						};
					}

					return event;
				}));
				// Remove anything that failed to load
				events = events.filter(e => e);

				console.log('Upcoming events loaded', events);
				this.setState({ loading: false, events });
			} catch (e) {
				console.error(e);
				this.setState({ loading: false, error: 'Unable to load events' });
			}
		}

		renderEvent(event) {
			if (event.isFallback) return <Fallback event={event} />;
			return <EventCard {...this.props} short event={event} />;
		}

		render() {
			const { loading, error } = this.state;
			const events = this.state.events || [];

			if (loading) {
				return <Spinner />;
			}

			if (!EventCard) EventCard = EventCardRef().html;

			return (
				<React.Fragment>
					{error ? (
						<div className="error">{error}</div>
					) : ''}
					<ul className="postfeed postfeed--direction-horizontal postfeed--events">
						{events.map(e => this.renderEvent(e))}
					</ul>
				</React.Fragment>
			);
		}
	};
};
