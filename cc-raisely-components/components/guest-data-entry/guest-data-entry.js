/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const { Button } = RaiselyComponents.Atoms;
	const { get, set } = RaiselyComponents.Common;
	const { api } = RaiselyComponents;
	const { getData, quickLoad } = api;

	const CustomForm = RaiselyComponents.import('custom-form');
	const UserSaveHelperRef = RaiselyComponents.import('cc-user-save', { asRaw: true });
	let UserSaveHelper;

	const preSurvey = 'cc-pre-survey-2019';
	const postSurvey = 'cc-post-survey-2019';
	const surveys = [preSurvey, postSurvey];

	let actionFields;

	/**
	 * Actions are stored on the interaction, but key ones are also copied to the
	 * user record
	 */
	const actionFieldsToUser = ['host', 'facilitate', 'volunteer'];

	// Show all questions in the pre survey
	const preSurveyQuestions = [{ interactionCategory: preSurvey }];
	// Show all questions in the post survey
	const postSurveyQuestions = [{
		interactionCategory: postSurvey,
		exclude: ['research', 'fundraise', 'host', 'volunteer', 'corporate', 'facilitate'],
	}];

	const guestAction = [
		'user.fullName',
		{ sourceFieldId: 'user.email', required: false },
		'user.phoneNumber', 'user.postcode',
		{
			interactionCategory: postSurvey,
			include: ['host', 'facilitate', 'volunteer', 'corporate', 'research', 'fundraise'],
		},
	];
	const guestDonation = ['event_rsvp.donationIntention', 'event_rsvp.donationAmount'];
	const conversationDate = [{ sourceFieldId: 'event.startAt', required: false }];

	const allSteps = [
		{ title: 'Pre-Survey', fields: preSurveyQuestions },
		{ title: 'Post-Survey', fields: postSurveyQuestions },
		{ title: 'Guest Action', fields: guestAction },
		{
			title: 'Warning: Uncontactable',
			description: `This person has indicated interest in taking action with us
				but they have no email address. Follow up will be very limited.`,
			fields: [{
				id: 'description-no-email',
				type: 'rich-description',
				default: `
					<p>Do you want to go back and enter an email for them?</p>
					<p>(Maybe you can message the host to ask
						if they want to share their email with us?)</p>`,
			}],
			condition: (fields) => {
				const takeAction = actionFields.reduce((result, field) =>
					result || get(fields, `2.private.${field}`, false), false);
				return (takeAction && !get(fields, '2.email'));
			},
		},
		{ title: 'Donation', fields: guestDonation },
		{
			title: 'Conversation Date',
			description: "Did you set a tentative date with them to host a conversation? (leave blank if you didn't)",
			fields: conversationDate,
			condition: fields => get(fields, '2.private.host'),
		},
	];

	return class GuestDataEntry extends React.Component {
		state = { key: new Date().toISOString() }

		load = async () => {
			const data = await quickLoad({
				models: ['event.private'],
				props: this.props,
				required: true,
			});

			this.event = data.event;
		}

		save = async (values, formToData) => {
			const data = formToData(values);
			const facilitatorUuid = this.props.global.user.uuid;
			const campaignUuid = this.props.global.campaign.uuid;

			// Copy interaction host, vol, facil over to user record
			actionFieldsToUser.forEach((field) => {
				const value = get(data, `interaction.${postSurvey}.detail.private.${field}`);
				if (value) {
					set(data, `user.private.${field}`, value);
				}
			});

			console.log('Saving survey. Form data:', data);

			const user = await UserSaveHelper.upsertUser(data.user);
			// temporary fix for upsert not returning an email
			if (!user.email) user.email = data.user.email;

			const interactionBase = {
				recordUuid: this.event.uuid,
				recordType: 'event',
				userUuid: user.uuid,
			};

			// Associate surveys with conversation and user
			const promises = surveys.map((survey) => {
				const record = get(data, `interaction.${survey}`);
				if (!record) return null;
				return Object.assign(record, {
					...interactionBase,
					// Set the interaction type
					categoryUuid: survey,
				});
			})
				.filter(s => s)
				.map(record => api.interactions.create({ data: record }))
				.map(getData);

			if (get(data, `interaction.${postSurvey}.detail.private.host`)) {
				promises.push(getData(api.interactions.create({
					data: {
						...interactionBase,
						categoryUuid: 'host-interest',
						detail: {
							private: {
								status: 'lead',
								source: 'conversation',
								assignedFacilitator: facilitatorUuid,
							},
						},
					},
				})));
			}

			if (!data.event_rsvp) data.eventRsvp = {};
			Object.assign(data.event_rsvp, {
				userUuid: user.uuid,
				type: 'guest',
				eventUuid: this.event.uuid,
			});

			promises.push(getData(api.eventRsvps.create({ data: data.event_rsvp })));

			// Save donation / donation intention
			if (get(data, 'event_rsvp.private.donationIntention') === 'cash') {
				promises.push(getData(api.donations.create({
					data: {
						campaignUuid,
						profileUuid: this.props.global.campaign.profile.uuid,
						userUuid: user.uuid,
						mode: 'LIVE',
						type: 'OFFLINE',
						method: 'OFFLINE',
						amount: get(data, 'event_rsvp.private.donationAmount'),
						email: user.email,
						private: {
							conversationUuid: this.event.uuid,
						},
						currency: 'SGD',
					},
				})));
			}

			// Add the future conversation
			if (get(data, 'event.startAt')) {
				Object.assign(data.event, {
					name: `<conversation name here>`,
					campaignUuid,
				});
				const promise = getData(api.events.create({ data: data.event }))
					// Add the facil and host to the conversation
					.then((event) => {
						return Promise.all([
							getData(api.eventRsvps.create({
								data: {
									type: 'host',
									userUuid: user.uuid,
									eventUuid: event.uuid,
								},
							})),
							getData(api.eventRsvps.create({
								data: {
									type: 'facilitator',
									userUuid: facilitatorUuid,
									eventUuid: event.uuid,
								},
							})),
						]);
					});
				promises.push(promise);
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
					return <p>Saving {descriptions[setting.id]} ... {status}</p>;
				});
			}

			return hasError ? details : (<p>Saving guest details</p>);
		}

		finalPage = ({ completeHref }) => {
			// Changing the key will cause react to re-fresh the component
			const reset = () => this.setState({ key: new Date().toISOString() });

			return (
				<div>
					<p>Guest saved!</p>
					<div>
						<Button theme="primary" onClick={reset}>Add another Guest</Button>
						<Button theme="secondary" href={completeHref}>Go back to dashboard</Button>
					</div>
				</div>
			);
		}

		render() {
			if (!UserSaveHelper) {
				try {
					UserSaveHelper = UserSaveHelperRef().html;
					({ actionFields } = UserSaveHelper);
				} catch (e) {}
			}

			const { key } = this.state;

			return (
				<div className="guest-data-entry-wrapper" key={key}>
					<CustomForm
						{...this.props}
						steps={allSteps}
						followNextQuery="1"
						controller={this}
					/>
				</div>
			);
		}
	};
};
