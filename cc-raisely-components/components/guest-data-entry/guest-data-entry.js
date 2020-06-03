/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const { Button, Icon } = RaiselyComponents.Atoms;
	const { get, set } = RaiselyComponents.Common;
	const { api, Spinner } = RaiselyComponents;
	const { getCurrentToken } = api;

	const websiteCampaignUuid = 'f2a3bc70-96d8-11e9-8a7b-47401a90ec39';
	const websiteProfileUuid = 'f2b41020-96d8-11e9-8a7b-47401a90ec39';

	const CustomForm = RaiselyComponents.import('custom-form');
	const UserSaveHelperRef = RaiselyComponents.import('cc-user-save', { asRaw: true });
	const ConversationRef = RaiselyComponents.import('conversation', { asRaw: true });
	const ReturnButton = RaiselyComponents.import('return-button');
	let UserSaveHelper;
	let Conversation;

	const WEBHOOK_URL = `https://asia-northeast1-climate-conversations-sync.cloudfunctions.net/raiselyPeople`;
	// const WEBHOOK_URL = `http://localhost:8010/conversation-sync/us-central1/raiselyPeople`;

	let actionFields;

	/**
	 * Actions are stored on the interaction, but key ones are also copied to the
	 * user record
	 */
	const actionFieldsToUser = ['host', 'facilitate', 'volunteer'];

	const guestDonation = ['event_rsvp.donationIntention', 'event_rsvp.donationAmount'];
	const conversationDate = [{ sourceFieldId: 'event.startAt', required: false }];

	return class GuestDataEntry extends React.Component {
		state = { key: new Date().toISOString() };

		componentDidMount() {
			this.testCanSave();
		}
		componentDidUpdate() {
			const eventUuid = get(this.props, 'match.params.conversation');
			// Reload the conversation and guests if the id has changed
			if (this.state.eventUuid !== eventUuid) {
				this.load();
			}
			if (!this.state.testingSave) this.testCanSave();

		}

		prepareSteps() {
			if (!Conversation) Conversation = ConversationRef().html;

			// Show all questions in the pre survey
			const preSurveyQuestions = [
				'user.nycConsent',
				{ interactionCategory: Conversation.surveyCategories().preSurvey },
				'user.dateOfBirth',
				{
					sourceFieldId: 'user.residency',
					type: 'select',
					options: [{"label": "Singapore Citizen", "value": "citizen"}, {"label": "Permanent Resident", "value": "permanent resident"}, {"label": "Employment Pass", "value": "employment pass"},{"label": "Other", "value": "Other"}],
				},
				'user.ethnicity',
				'user.gender',
			];
			// Show all questions in the post survey
			const postSurveyQuestions = [{
				interactionCategory: Conversation.surveyCategories().postSurvey,
				exclude: ['research', 'fundraise', 'host', 'volunteer', 'hostCorporate', 'facilitate'],
			}];

			const guestAction = [
				'user.fullName',
				'user.preferredName',
				{ sourceFieldId: 'user.email', required: false },
				'user.phoneNumber', 'user.postcode',
				{
					interactionCategory: Conversation.surveyCategories().postSurvey,
					include: ['host', 'facilitate', 'volunteer', 'hostCorporate', 'research', 'fundraise'],
				},
			];

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
			return allSteps;
		}

		load = async () => {
			const event = await Conversation.loadConversation({
				props: this.props,
				required: true,
				private: true,
			});

			const eventUuid = get(this.props, 'match.params.conversation');
			this.setState({ event, eventUuid });
		}

		save = async (values, formToData) => {
			const data = formToData(values);
			const facilitatorUuid = this.props.global.user.uuid;
			const campaignUuid = this.props.global.campaign.uuid;

			if (!Conversation) Conversation = ConversationRef().html;
			const surveyCategories = Conversation.surveyCategories();
			const surveys = [surveyCategories.preSurvey, surveyCategories.postSurvey];

			// Copy interaction host, vol, facil over to user record
			actionFieldsToUser.forEach((field) => {
				const value = get(data, `interaction.${surveyCategories.postSurvey}.detail.private.${field}`);
				if (value) {
					set(data, `user.private.${field}`, value);
				}
			});
			// Mark them having attended a conversation
			set(data, 'user.private.attendedConversation', true);

			console.log('Saving survey. Form data:', data);

			// If they've filled out the CTA with their email, put them on the mailing list
			if (data.user.email) {
				set(data, 'user.private.mailingList', true);
			}

			console.log('Upserting user', data.user);
			const user = await UserSaveHelper.upsertUser(data.user, { assignSelf: true });
			// temporary fix for upsert not returning an email
			if (!user.email) user.email = data.user.email;

			const interactionBase = {
				recordUuid: this.state.event.uuid,
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
				.map(record => {
					console.log(`Saving survey ${record.categoryUuid}`, record);
					return UserSaveHelper.proxy('/interactions', { method: 'POST', body: { data: record } });
				});

			if (get(data, `interaction.${surveyCategories.postSurvey}.detail.private.host`)) {
				const hostData = {
					...interactionBase,
					categoryUuid: 'host-interest',
					detail: {
						private: {
							facilitatorUuid,
							status: 'lead',
							source: 'conversation',
							conversationUuid: this.state.event.uuid,
						},
					},
				};
				console.log('Saving host', hostData)
				promises.push(UserSaveHelper.proxy('/interactions', { method: 'POST', body: { data: hostData } }));
			}

			// eslint-disable-next-line camelcase
			if (!data.event_rsvp) data.event_rsvp = {};
			Object.assign(data.event_rsvp, {
				userUuid: user.uuid,
				type: 'guest',
				eventUuid: this.state.event.uuid,
			});

			console.log('Saving guest rsvp', data.event_rsvp);
			promises.push(
				UserSaveHelper.proxy('/event_rsvps', { method: 'POST', body: { data: data.event_rsvp } })
					.then(rsvp => this.setState({ rsvpUuid: rsvp.uuid }))
			);

			// Save donation / donation intention
			const cashPaymentType = get(data, 'event_rsvp.private.donationIntention');
			if (['transfer', 'cash'].includes(cashPaymentType)) {
				const donation = {
					campaignUuid: websiteCampaignUuid,
					profileUuid: websiteProfileUuid,
					userUuid: user.uuid,
					anonymous: true,
					mode: 'LIVE',
					type: 'OFFLINE',
					method: 'OFFLINE',
					amount: get(data, 'event_rsvp.private.donationAmount'),
					email: user.email,
					private: {
						conversationUuid: this.state.event.uuid,
						cashPaymentType,
					},
					currency: 'SGD',
				};
				console.log('Saving donation', donation);
				promises.push(
					UserSaveHelper.proxy('/donations', {
						method: 'POST',
						body: {
							data: donation
						},
					}));
			}

			// Add the future conversation
			if (get(data, 'event.startAt')) {
				if (!Conversation) Conversation = ConversationRef().html;
				Object.assign(data.event, {
					name: Conversation.defaultName([user]),
					campaignUuid,
				});

				console.log('Creating tentative new conversation', data.event);

				const promise = UserSaveHelper.proxy('/events', {
					method: 'POST',
					body: { data: data.event },
				})
					// Add the facil and host to the conversation
					.then((event) => {
						const hostRsvp = {
							type: 'host',
							userUuid: user.uuid,
							eventUuid: event.uuid,
						};
						const facilitatorRsvp = {
							type: 'facilitator',
							userUuid: facilitatorUuid,
							eventUuid: event.uuid,
						};

						console.log('Assigning host and facilitator to conversation', hostRsvp, facilitatorRsvp);
						return Promise.all([
							UserSaveHelper.proxy('/event_rsvps', { method: 'POST', body: { data: hostRsvp } }),
							UserSaveHelper.proxy('/event_rsvps', { method: 'POST', body: { data: facilitatorRsvp } }),
						]);
					});
				promises.push(promise);
			}

			await Promise.all(promises);

			const rsvp = get(data, 'event_rsvp');
			const { rsvpUuid } = this.state;
			rsvp.uuid = rsvpUuid;

			const webhookData = {
				type: 'guest.created',
				data: {
					user,
					preSurvey: get(data, `interaction.${surveyCategories.preSurvey}.detail`),
					postSurvey: get(data, `interaction.${surveyCategories.postSurvey}.detail`),
					conversation: this.state.event,
					rsvp,
				}
			};
			console.log('Sending to conversation-sync webhook', webhookData);
			// Send the guest to be added to the backend spreadsheet
			await UserSaveHelper.doFetch(WEBHOOK_URL, {
				method: 'post',
				body: {
					data: webhookData,
				}
			});
		}

		/**
		 * Tests that the users token has permission to save to
		 * the webhook url so we find out *before* they do the
		 * data entry
		 */
		async testCanSave() {
			try {
				const token = getCurrentToken();
				// ComponentDidMount gets called twice, once before
				// props have finished loading
				// don't send a request without a token
				if (!token) return;

				if (!get(this.props, 'global.user')) return;

				this.setState({ testingSave: true })

				const tags = get(this.props, 'global.user.tags', []);
				if (!tags.find(tag => ['team-leader', 'facilitator'].includes(tag.path))) {
					throw new Error("You don't appear to be a facilitator or team leader");
				}

				await UserSaveHelper.doFetch(WEBHOOK_URL, {
						method: 'post',
						body: {}
					});
			} catch (e) {
				console.error(e);
				this.setState({
					webhookError: e,
					message: e.message || '(Unknown Error)',
				});
			}
			this.setState({ hookSuccessful: true });
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
					return <p key={setting}>Saving {descriptions[setting.id]} ... {status}</p>;
				});
			}

			return hasError ? details : (<p>Saving guest details</p>);
		}

		finalPage = ({ completeHref }) => {
			const { rsvpUuid } = this.state;
			// Changing the key will cause react to re-fresh the component
			const reset = () => this.setState({ key: new Date().toISOString() });
			const reviewLink =  `/surveys/${rsvpUuid}`;

			return (
				<div>
					<p>Guest saved!</p>
					<div>
						<p>
							As this is the first conversation {"you've"} processed a conversation
							in the new system, could you do us a favour and review the saved details
							and check that everything was saved correctly?
						</p>
						<Button theme="cta" href={reviewLink}>Review Guest Details</Button>
					</div>
					<div>
						<Button theme="primary" onClick={reset}>Add another Guest</Button>
						<ReturnButton {...this.props} backTheme="secondary" backLabel="Go back"
							theme="secondary" href={completeHref}>Go back to dashboard</ReturnButton>
					</div>
				</div>
			);
		}

		renderCanSave() {
			const { hookSuccessful } = this.state;
			return (
				<div className="save-validation">
					{hookSuccessful ? (
						<p>
							<Icon name="done" size="small" />
							Permissions to save guests verified
						</p>
					) : (
						<p>
							<Spinner className="spinner" sceneHeight="1rem" size="0.5" />
							Verifying permission to save guests
						</p>
					)}
				</div>
			)
		}

		render() {
			const { error, webhookError, key } = this.state;

			if (webhookError) {
				return (
					<div className="guest-data-entry-wrapper" key={key}>
						<h4>Error!</h4>
						<p>Sorry, your account {"doesn't"} seem to have permission to save guest data.</p>
						<p>(We thought we should stop you now before you do all that typing)</p>
						<p>Please contact your team leader or program co-ordinator to resolve this</p>
						<p>The error is: {error}</p>
					</div>
				)
			}

			if (!UserSaveHelper) {
				UserSaveHelper = UserSaveHelperRef().html;
				({ actionFields } = UserSaveHelper);
			}

			return (
				<div className="guest-data-entry-wrapper" key={key}>
					<div className="hint">
						<p><strong>Hint:</strong> To get throught your surveys faster, press <strong>Tab</strong> between fields and type in the answers.</p>
						<p>For scale fields, type in the number that was ticked.</p>
						<p>For multiple choice fields, press the down arrow or type the first few characters of the answer you want to choose</p>
						<p>For checkboxes press spacebar to check/uncheck the box</p>
						<p>(You can do this on all forms in the volunteer portal, not just this one)</p>
					</div>
					{this.renderCanSave()}
					<CustomForm
						{...this.props}
						steps={this.prepareSteps()}
						followNextQuery="1"
						controller={this}
					/>
				</div>
			);
		}
	};
};
