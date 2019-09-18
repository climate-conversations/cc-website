/**
 * Changes the background on a selected element based on event photos
 */
(RaiselyComponents, React) => {
	const { api } = RaiselyComponents;
	const { get } = RaiselyComponents.Common;
	const { getData } = api;

	return class EventBackground extends React.Component {
		componentDidMount() {
			this.getEvents()
				.catch(console.error);
		}
		componentWillUnmount() {
			if (this.interval) {
				clearInterval(this.interval);
				this.interval = null;
			}
			it (this.timeout) {
				clearTimeout(this.timeout);
				this.timeout = null;
			}
		}

		onTimeout = () => {
			this.changeBackground();
			const { repeat, period } = this.getValues();
			if (repeat && period && !this.interval) {
				this.interval = setInterval(this.changeBackground, period * 1000);
			}
		}

		async getEvents() {
			const limit = 20;
			let userUuid = get(this.props, 'current.user.uuid');
			let events;

			const { source, order } = this.getValues();
			if ((source === 'all') || !userUuid) {
				events = await getData(api.events.getAll({ query: { limit, order, photoUrl: 'NOT_NULL' } }));
			} else {
				if (source === 'team') {
					const facilitators = await getData(api.users.getAll({ query: { 'private.teamLeaderUuid': userUuid } }));
					userUuid = facilitators.map(f => f.uuid).join(',');
				}
				const rsvps = await getData(api.eventRsvps.getAll({ query: { userUuid, type: 'facilitator,co-facilitator' } }));
				events = rsvps.map(rsvp => rsvp.event);
			}

			const backgrounds = events
				.map(e => e.photoUrl)
				.filter(bg => bg);

			if (!backgrounds.length) {
				console.log('NOTE: bg changer found 0 events with photos');
				return;
			}
			this.setState({ backgrounds }, () => {
				this.timeout = setTimeout(this.onTimeout, 3000);
			});
		}

		setBackground = (url) => {
			const time = 1;

			// Find the background element
			const { className } = this.getValues();
			const elementId = `.${className} .row__bg`;
			const [parentElement] = document.getElementsByClassName(className);
			if (!parentElement) {
				console.error(`Could not find element $(${className})`);
				return;
			}
			const [bgElement] = parentElement.getElementsByClassName('row__bg');
			if (!bgElement) {
				console.error(`Could not find element $(${elementId})`);
				return;
			}

			// set an opacity transition
			bgElement.style.transition = `opacity ${time}s linear`;

			// Duplicate it and insert at 0 opacity
			const newBg = bgElement.cloneNode();
			newBg.style.backgroundImage = `url(${url})`;
			newBg.style.opacity = 0;

			// Insert the new background and being a transition on opacity
			bgElement.insertAdjacentElement('beforebegin', newBg);
			newBg.style.opacity = bgElement.style.opacity;
			bgElement.style.opacity = 0;

			// Remove the old element at the end of the fade
			setTimeout(() => bgElement.remove(), time * 1000);
		}

		getValues() {
			if (this.values) return this.values;

			const defaults = {
				className: 'row--1',
				source: 'all',
				period: '10',
				repeat: true,
				order: 'asc',
			};
			const values = this.props.getValues();

			const validSources = ['any', 'facilitator', 'team'];
			const validOrders = ['asc', 'desc', 'random'];

			if (!values.className) values.className = defaults.className;
			if (!validSources.includes(values.source)) values.source = defaults.source;
			if (!validOrders.includes(values.order)) values.order = defaults.order;
			if (!Object.keys(values).includes('repeat')) values.repeat = defaults.repeat;
			if (!values.period) values.period = defaults.period;

			const { mock } = this.props.global.campaign;
			// If we're in the editor, this is probably the right choice
			if (mock) values.className = 'row--0';

			this.values = values;

			return values;
		}

		changeBackground = () => {
			const { backgrounds } = this.state;
			let index = this.state.index || 0;
			index = (index + 1) % backgrounds.length;

			this.setBackground(backgrounds[index]);
		}

		render() {
			const isMock = get(this.props, 'global.campaign.mock');
			if (!isMock) return '';

			const style = {
				color: 'gray',
				fontWeight: 'bold',
			};

			// eslint-disable-next-line object-curly-newline
			const { period, repeat, source, className } = this.getValues();

			const interval = repeat ? `${period}s` : 'once';

			const notice = `BG changer ${interval} .${className} ${source} `;

			// Display a notice in the editor
			return <span style={style}>{notice}</span>;
		}
	};
};
