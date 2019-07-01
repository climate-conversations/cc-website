/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const { Button } = RaiselyComponents.Atoms;
	const { get, set } = RaiselyComponents.Common;
	const { api } = RaiselyComponents;

	const CustomForm = RaiselyComponents.import('custom-form');

	const preSurvey = 'cc-pre-survey-2019';
	const postSurvey = 'cc-post-survey-2019';
	const surveys = [preSurvey, postSurvey];

	/**
	 * Action fields that a user can opt in to
	 */
	const actionFields = ['host', 'facilitate', 'volunteer', 'corporate', 'research', 'fundraise'];
	/**
	 * Actions are stored on the interaction, but key ones are also copied to the
	 * user record
	 */
	const actionFieldsToUser = ['host', 'facilitate', 'volunteer']

	// Show all questions in the pre survey
	const preSurveyQuestions = [{ interactionCategory: preSurvey, exclude: ['conversationUuid'] }];
	// Show all questions in the post survey
	const postSurveyQuestions = [{
		interactionCategory: postSurvey,
		exclude: ['research', 'fundraise', 'host', 'volunteer', 'corporate'],
	}];
	// Fixme warn the facil that without an email, follow up will be limited, and ask the
	// host if they can get it
	const guestAction = ['user.fullName', 'user.email', 'user.phone', 'user.postcode',
		{
			interactionCategory: postSurvey,
			include: ['host', 'facilitate', 'volunteer', 'corporate', 'research', 'fundraise'],
		},
	];
	const guestDonation = ['eventRsvp.donationIntention', 'eventRsvp.donationAmount'];
	const conversationDate = ['event.startDate'];

	const allSteps = [
		{ title: 'Pre-Survey', fields: preSurveyQuestions },
		{ title: 'Post-Survey', fields: postSurveyQuestions },
		{ title: 'Guest Action', fields: guestAction },
		{
			fields: [{
				id: 'description-no-email',
				type: 'rich-description',
				default: `
					<p>Warning: This person has indicated interest in taking action with us
					but they have no email address. Follow up will be limited. </p>
					<p>Do you want to go back and enter an email for them?
					 (Maybe you can ask the host
						if they are sure they want to share their email with us?)</p>`
			}],
			condition: (fields) => {
				const takeAction = actionFields.reduce((field, result) =>
					result || fields[3][`interaction.${preSurvey}.${field}`], false);
				return (takeAction && !fields[3].user.email);
			},
		},
		{ title: 'Donation', fields: guestDonation },
		{
			title: 'Conversation Date',
			fields: conversationDate,
			condition: fields => fields[3].private.host,
		},
	];

	return class GuestDataEntry extends React.Component {
		load = async () => {
			const data = await quickLoad({
				models: ['event'],
				props: this.props,
				required: true,
			});

			this.event = data.event;
		}

		save = async (values, formToData) => {
			const data = formToData(values);

			// Copy interaction host, vol, facil over to user record
			actionFieldsToUser.forEach((field) => {
				const value = get(data, `interaction.${preSurvey}.${field}`);
				if (value || value === false) {
					set(data, `user.${field}`, value);
				}
			});

			const user = await upsert('user', data.user);

			// Associate surveys with conversation and user
			surveys.forEach(survey =>
				Object.assign(data.interaction[survey], {
					// Set the interqaction type
					category: survey,
					record: this.event.uuid,
					recordType: 'event',
					userUuid: user.uuid,
				}));

			// Save surveys
			const promises = [
				api.interactions.create(data.interaction[preSurvey]),
				api.interactions.create(data.interaction[postSurvey]),
			];

			Object.assign(data.eventRsvp, {
				userUuid: user.uuid,
				type: 'guest',
				eventUuid: this.event.uuid,
			});

			promises.push(api.eventRsvps.create(data.eventRsvp));

			// Save donation / donation intention
			if (data.donationType === 'cash') {
				promises.push(api.donations.create({
					userUuid: user.uuid,
					mode: 'LIVE',
					type: 'OFFLINE',
					method: 'OFFLINE',
					amount: data.donation.amount,
					email: user.email,
					private: {
						conversationUuid: this.event.uuid,
					},
					currency: 'SGD',
				}));
			}

			// Add the future conversation
			if (conversationDate) {
				Object.assign(data.event, {
					name: `<conversation name here>`,
				});
				api.events.create(data.event)
					// Add the facil and host to the conversation
					.then((event) => {
						return Promise.all([
							api.eventRsvps.create({
								type: 'host',
								userUuid: user.uuid,
								eventUuid: event.uuid,
							}),
							api.eventRsvps.create({
								type: 'facilitator',
								userUuid: this.props.global.user.uuid,
								eventUuid: event.uuid,
							}),
						]);
					});
			}

			return Promise.all(promises);
		}

		saving() {
			const descriptions = {
				user: 'guest details',
				survey: 'survey',
				donation: 'cash donation',
				intention: 'donation intention',
				conversation: 'new conversation',
				demographics: 'demographics',
			};

			let hasError = false;
			let details;

			if (this.state.saving) {
				details = this.state.saving.map((setting) => {
					if (setting.message) hasError = true;
					const status = setting.message || 'OK';
					return <p>Saving {descriptions[setting.id]} ... {status}</p>
				});
			}

			return hasError ? details : (<p>Saving guest details</p>);
		}

		finalPage({ completeHref }) {
			// Changing the key will cause react to re-fresh the component
			const reset = () => this.setState({ key: 'something new' });

			return (
				<div>
					<p>Guest saved!</p>
					<div>
						<Button theme="primary" onClick={reset}>Add another profile</Button>
						<Button theme="secondary" href={completeHref}>Go to dashboard</Button>
					</div>
				</div>
			);
		}

		render() {
			return (
				<div className="guest-data-entry-wrapper">
					<CustomForm
						steps={allSteps}
						followNextQuery="1"
					/>
				</div>
			);
		}
	};
};
