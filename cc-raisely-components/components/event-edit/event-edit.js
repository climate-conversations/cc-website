/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const { api } = RaiselyComponents;
	const { getData, save } = api;
	const { get } = RaiselyComponents.Common;

	const CustomForm = RaiselyComponents.import('custom-form');

	return class EventEdit extends React.Component {
		state = { title: 'Create Event' };

		buildSteps() {
			const { title } = this.state;
			const fields = ['event.name', 'event.path', 'event.photoUrl', 'event.startAt', 'event.endAt',
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

			const newState = { event };

			if (get(event, 'uuid')) newState.title = 'Edit Event';

			this.setState(newState);

			return dataToForm({ event });
		}

		save = async (values, formToData) => {
			const { event } = formToData(values);

			if (!event.uuid) {
				event.userUuid = get(this, 'props.global.user.uuid');
				event.campaignUuid = this.props.global.campaign.uuid;
			}
			await getData(save('event', event));
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

