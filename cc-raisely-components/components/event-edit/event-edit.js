/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const { api } = RaiselyComponents;
	const { getData, getQuery, save } = api;
	const { dayjs, get, set } = RaiselyComponents.Common;

	const CustomForm = RaiselyComponents.import('custom-form');
	const EventRsvp = RaiselyComponents.import('event-rsvp');
	const CCEventRef = RaiselyComponents.import('event', { asRaw: true });
	let CCEvent;

	const sgOffset = 480;

	function offsetLocalToSg() {
		const localOffset = new Date().getTimezoneOffset();
		const diff = localOffset + sgOffset;
		return diff;
	}
	function singaporeTimezone(date) {
		const diff = offsetLocalToSg();
		return dayjs(date).subtract(diff, 'minute');
	}
	function fromUTC(date) {
		const diff = offsetLocalToSg();
		return dayjs(date).add(diff, 'minute');
	}
	function timeFromDate(date) {
		const adjustedTime = fromUTC(date, true);
		return {
			time: adjustedTime.format('HH:mm'),
			date: adjustedTime.format('YYYY-MM-DD'),
		};
	}

	function dataAndTime(date, time) {
		const justDate = dayjs(date).format('YYYY-MM-DD');
		const fullTime = dayjs(`${justDate} ${time}`);
		if (!fullTime.isValid()) {
			throw new Error(`Cannot understand ${time}. Please specify the time in 24hr format (eg 21:30)`)
		}
		const adjustedTime = singaporeTimezone(fullTime);
		// Make the time in Singapore time
		return adjustedTime.toISOString();
	}

	return class EventEdit extends React.Component {
		state = {};

		static inSingaporeTime(date) {
			return fromUTC(dayjs(date));
		}
		static singaporeTimeAndDate(date) {
			return timeFromDate(date);
		}
		onUpdate = (values, formToData) => {
			const data = formToData(values);
			this.setState({ event: data.event });
		}
		setTime(event) {
			/* eslint-disable no-param-reassign */
			event.timezone = 'Singapore/Singapore';

			event.startAt = dataAndTime(event.startAt, event.startTime);
			event.endAt = dataAndTime(event.endAt, event.endTime);
			if (event.publicConversationAt) {
				event.publicConversationAt = dataAndTime(event.publicConversationAt, '12:00');
			}
		}
		getTime(event) {
			if (event.startAt) {
				const startDate = timeFromDate(event.startAt);
				event.startAt = startDate.date;
				event.startTime = startDate.time;
			}
			if (event.endAt) {
				const endDate = timeFromDate(event.endAt);
				event.endAt = endDate.date;
				event.endTime = endDate.time;
			}
			if (event.publicConversationAt) {
				const conversationDate = timeFromDate(event.startAt);
				event.publicConversationAt = conversationDate.date;
			}
		}

		buildSteps() {
			const { title } = this.state;
			const fields = ['event.name', 'event.path', 'event.eventType',
				{
					id: 'status',
					type: 'select',
					label: 'Event status',
					options: [
						{ label: 'Draft', value: 'draft' },
						{ label: 'Published', value: 'published' },
						{ label: 'Hidden', value: 'hidden' },
						{ label: 'Cancelled', value: 'cancelled' },
					],
					default: 'published',
					core: false,
					private: false,
					recordType: 'event',
				},

				/* eslint-disable object-property-newline,object-curly-newline */
				'event.photoUrl',
				{
					id: 'rsvp-info',
					type: 'rich-description',
					default: '<h5>How should people RSVP</h5>',
				},
				'event.signupMethod',
				'event.rsvpFields',
				{
					id: 'linking-info',
					type: 'rich-description',
					default: `
						<p>To embed a paperform:</p>
						<ol><li>Edit the form in paperform</li>
						<li>Click on share at the top</li>
						<li>Choose embed</li>
						<li>Copy the code inside <strong>inline embed</strong> and paste it below</li></ol>`,
					rules: {
						match: 'all',
						conditions: [{ field: 'public.signupMethod', comparison: 'eq', value: 'embed' }]
					},
				},
				'event.signupUrl', 'event.signupEmbed',
				{
					id: 'rsvp-info',
					type: 'rich-description',
					default: '<h5>Event Details</h5>',
				},
				'event.startAt',
				{ id: 'startTime', type: 'text', core: true, default: '19:00', recordType: 'event', label: 'Start Time' },
				'event.endAt',
				{ id: 'endTime', type: 'text', core: true, default: '21:00', recordType: 'event', label: 'End Time' },
				'event.publicConversationAt',
				'event.multiDates',
				'event.venue', 'event.address1', 'event.address2', 'event.postcode', 'event.description',
				'event.intro', 'event.isPrivate',
			];

			const step1 = {
				title,
				fields,
			};
			return [step1];
		}

		load = async ({ dataToForm }) => {
			const { clone } = getQuery(get(this.props, 'router.location.search'));
			let event;
			if (clone) {
				event = await getData(api.events.get({
					id: clone,
					query: { private: 1 },
				}));
				delete event.uuid;
			} else {
				({ event } = await api
					.quickLoad({ props: this.props, models: ['event.private'], required: false }));
			}

			if (event) {
				this.getTime(event);
			}
			const newState = { event };
			if (!event) {
				if (!CCEvent) CCEvent = CCEventRef().html;
				const defaultRsvpFields = CCEvent.getDefaultRsvpFields().join(';');

				set(event, 'public.rsvpFields', defaultRsvpFields);
			}

			if (get(event, 'uuid')) newState.title = 'Edit Event';

			this.setState(newState);

			return dataToForm({ event });
		}

		save = async (values, formToData) => {
			const { event } = formToData(values);

			this.setTime(event);

			if (!event.uuid) {
				event.userUuid = get(this, 'props.global.user.uuid');
				event.campaignUuid = this.props.global.campaign.uuid;
			}
			await getData(save('event', event, { partial: true }));
		}

		render() {
			const steps = this.buildSteps();
			// eslint-disable-next-line object-curly-newline
			const props = { ...this.props, steps, controller: this, updateValues: this.onUpdate };
			const backgroundColour = 'purple';
			const className = `col col--6 custom-form--event-edit block--${backgroundColour}`;

			let { event } = this.state;
			let method;
			if (event) {
				if (!CCEvent) CCEvent = CCEventRef().html;
				method = CCEvent.getRsvpMethod(event);
			} else {
				method = 'raisely';
				event = {
					name: 'Example Event',
				};
			}
			const rsvpProps = { ...this.props, example: true, event };
			const rsvpHeader = (method === 'link') ? 'Example Event' : 'Example RSVP form';

			return (
				<div className="custom-form--event-edit__wrapper">
					<div className={className}>
						<h3>Event Settings</h3>
						<CustomForm {...{ ...props }} />
					</div>
					<div className="event-edit__rsvp-preview col col--6">
						<h3>{rsvpHeader}</h3>
						<EventRsvp {...{ ...rsvpProps }} />
					</div>
				</div>
			);
		}
	};
};

