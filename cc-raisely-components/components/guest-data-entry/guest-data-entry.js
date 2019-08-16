/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const { Button } = RaiselyComponents.Atoms;
	const { get, set } = RaiselyComponents.Common;
	const { api } = RaiselyComponents;
	const { quickLoad, save } = api;

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

	async function findUserBy(attribute, record) {
		throw new Error("This API is not live yet");
		const query = _.pick(record, [attribute]);
		query.private=1;
		return getData(api.users.findAll({ query }));
	}

	/**
	 * Set alternate value for email or phone if primary is already
	 * set to something different
	 * If the primary or alternate value is not already the same as
	 * the new primary value, put the old primary value in the alternate field
	 * @param {object} existing Existing user record
	 * @param {object} user Record to update with
	 * @param {string} field Primary field
	 * @param {string} alternate Alternate field
	 */
	function setAlternate(existing, user, field, alternate) {
		const primaryValue = get(existing, field);
		const newPrimary = get(user, field);
		if (primaryValue && newPrimary && primaryValue !== newPrimary) {
			const secondaryValue = get(existing, alternate);
			if (secondaryValue && secondaryValue !== newPrimary) {
				set(user, alternate, primaryValue);
			}
		}
	}

	function prepareUserForSave(existing, user) {
		if (existing) {
			setAlternate(existing, user, 'email', 'private.alternateEmail');
			setAlternate(existing, user, 'phoneNumber', 'private.alternatePhone');
		}
		const privateKeys = Object.keys(get(user, 'private', {}));
		// Delete any action keys that are false so we don't overwrite existing
		actionFields.forEach((field) => {
			// eslint-disable-next-line no-param-reassign
			if (privateKeys.includes(field) && !user.private[field]) delete user.private[field];
		});
		// Raisely requires an email address, so create a dummy address if one's not
		// there so we can store the other data
		throw new Error('Must create dummy email');
	}

	async function upsertUser(record) {
		let existing;
		if (!record.uuid) {
			const promises = [];
			if (record.email) promises.push(findUserBy('email', record));
			if (record.phoneNumber) promises.push(findUserBy('phoneNumber', record));

			// Concat all results (if any)
			const existingCheck = await Promise.all(promises);
			[existing] = existingCheck.reduce((all, result) => all.concat(result), []);
			if (existing) {
				// eslint-disable-next-line no-param-reassign
				record.uuid = existing.uuid;
			}
		}
		prepareUserForSave(existing, record);
		return save('user', record, { partial: 1 });
	}

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

			const user = await upsertUser(data.user);

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
					return <p>Saving {descriptions[setting.id]} ... {status}</p>;
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
						{...this.props}
						steps={allSteps}
						followNextQuery="1"
					/>
				</div>
			);
		}
	};
};
