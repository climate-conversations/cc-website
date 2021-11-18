(RaiselyComponents, React) => {
	const { dayjs, get } = RaiselyComponents.Common;
	const EventRef = RaiselyComponents.import('event', { asRaw: true });
	let Event;

	function staticGetEvent(props) {
		const { mock } = props.global.campaign;
		if (mock) {
			return {
				name: 'Event Start Time',
			};
		}

		return get(props, 'event') || get(props, 'global.current.event');
	}

	return function EventDisplayTime(props) {
		const event = staticGetEvent(props);
		console.log('event: ', event);
		let date = ' ';
		let time = ' ';

		if (!Event) Event = EventRef().html;
		if (event.startAt) {
			const startAt = Event.inSingaporeTime(dayjs(event.startAt));
			date = startAt.format('dddd, MMMM D');
			time = startAt.format('h:mm a');

			return (
				<h4>
					{date} {time} Singapore Time
				</h4>
			);
		}

		return <h4>{event.name}</h4>;
	};
};
