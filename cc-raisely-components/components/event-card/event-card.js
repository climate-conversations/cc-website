(RaiselyComponents, React) => {
	const { dayjs, get } = RaiselyComponents.Common;
	const { Link } = RaiselyComponents;

	const EventEditRef = RaiselyComponents.import('event-edit', { asRaw: true });
	let EventEdit;

	return function EventCard(props) {
		const { event, short, disableLink, hideEdit } = props;
		const defaultPhoto = 'https://raisely-images.imgix.net/climate-conversations-2019/uploads/conversation-1-jpg-bc7064.jpg';

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
		const link = { href: get(event, 'public.signupMethod') === 'link' && get(event, 'public.signupUrl') };
		if (link.href) {
			link.target = '_blank';
		} else {
			// For facilitator training, link to the facilitate page
			// so they can read the full commitment
			if (get(event, 'public.eventType') === 'Facilitator Training') {
				link.href = '/facilitate'
			} else {
				link.href = `/events/${event.uuid}/view`;
			}
		}
		const edit = `/events/${event.uuid}/edit`;
		const clone = `/events/create?clone=${event.uuid}`;
		const rsvps = `/events/${event.uuid}/rsvps`;

		const classes = {
			hidden: 'secret',
		};

		const status = get(event, 'public.status', 'published');
		const className = `postfeed__item ${classes[status] || status}`;

		return (
			<div className={className}>
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
							{!short ? (
								<div className="post__meta__description">
									{get(event, 'public.intro')}
								</div>
							) : ''}
						</div>
						{!short ? (
							<div className="post__buttons--wrapper">
								{hideEdit ? '' : (
									<div className="show--logged-in hide--logged-out">
										<Link className="button button--cta post__link show--logged-in hide--logged-out" href={edit}>Edit</Link>
										<Link className="button button--secondary post__link show--logged-in hide--logged-out" href={rsvps}>RSVPs</Link>
										<Link className="button button--cta post__link show--logged-in hide--logged-out" href={clone}>Clone</Link>
									</div>
								)}
								{disableLink ? '' : (
									<Link className="button button--primary post__link" {...link}>Sign up</Link>
								)}
							</div>
						) : ''}
					</div>
				</div>
			</div>
		);
	};
};
