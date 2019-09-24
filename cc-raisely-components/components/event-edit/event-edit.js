/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const { api } = RaiselyComponents;
	const { getData, save } = api;
	const { dayjs, get } = RaiselyComponents.Common;

	const CustomForm = RaiselyComponents.import('custom-form');

	function singaporeTimezone(date) {
		const sgOffset = 480;
		const localOffset = new Date().getTimezoneOffset();
		const diff = localOffset + sgOffset;

		return dayjs(date).add(diff, 'minute');
	}
	function timeFromDate(date) {
		const adjustedTime = singaporeTimezone(date);
		return {
			time: adjustedTime.format('hh:mm'),
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
		state = { title: 'Create Event' };

		static inSingaporeTime(date) {
			return singaporeTimezone(dayjs(date));
		}
		static singaporeTimeAndDate(date) {
			return timeFromDate(date);
		}

		setTime(event) {
			/* eslint-disable no-param-reassign */
			event.timezone = 'Singapore/Singapore';

			event.startAt = dataAndTime(event.startAt, event.startTime);
			event.endAt = dataAndTime(event.endAt, event.endTime);
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
		}

		buildSteps() {
			const { title } = this.state;
			const fields = ['event.name', 'event.path', 'event.photoUrl', 'event.startAt',
				{ id: 'startTime', type: 'text', core: true, default: '19:00', recordType: 'event', label: 'Start Time' },
				'event.endAt',
				{ id: 'endTime', type: 'text', core: true, default: '21:00', recordType: 'event', label: 'End Time' },
				'event.additionalDates',
				'event.venue', 'event.address1', 'event.address2', 'event.postcode', 'event.description',
				'event.intro', 'event.isPrivate',
				{
					id: 'linking-info',
					type: 'rich-description',
					default: `
						<h6>Connect Signup</h6>
						<p>Specify how to signup for the event by linking to a signup page or
						embedding a form.</p>
						<p>To embed a paperform:</p>
						<ol><li>Edit the form in paperform</li>
						<li>Click on share at the top</li>
						<li>Choose embed</li>
						<li>Copy the code inside <strong>inline embed</strong> and paste it below</li></ol>`,
				},
				'event.signupUrl', 'event.signupEmbed',
			];
			const step1 = {
				title,
				fields,
			};

			return [step1];
		}

		load = async ({ dataToForm }) => {
			const { event } = await api
				.quickLoad({ props: this.props, models: ['event.private'], required: false });

			if (event) {
				this.getTime(event);
			}
			const newState = { event };

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
			const props = { ...this.props, steps, controller: this };
			const backgroundColour = 'purple';
			const className = `custom-form--event-edit block--${backgroundColour}`;

			return (
				<div className={className}>
					<CustomForm {...{ ...props }} />
				</div>
			);
		}
	};
};

