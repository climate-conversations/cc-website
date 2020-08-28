/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const { Button, Icon, ProgressBar } = RaiselyComponents.Atoms;
	const { get, set, startCase } = RaiselyComponents.Common;
	const { api, Spinner } = RaiselyComponents;
	const { getCurrentToken, getData } = api;

	const websiteCampaignUuid = 'f2a3bc70-96d8-11e9-8a7b-47401a90ec39';
	const websiteProfileUuid = 'f2b41020-96d8-11e9-8a7b-47401a90ec39';

	const CustomForm = RaiselyComponents.import('custom-form');
	const UserSaveHelperRef = RaiselyComponents.import('cc-user-save', { asRaw: true });
	const ConversationRef = RaiselyComponents.import('conversation', { asRaw: true });
	const ReturnButton = RaiselyComponents.import('return-button');
	const RaiselyButton = RaiselyComponents.import('raisely-button');
	let UserSaveHelper;
	let Conversation;

	const WEBHOOK_URL = `https://asia-northeast1-climate-conversations-sync.cloudfunctions.net/raiselyPeople`;
	// const WEBHOOK_URL = `http://localhost:8010/conversation-sync/us-central1/raiselyPeople`;

	let actionFields;

	// Fields that can only be set, but not updated
	const preSurveyReadOnly = ['user.dateOfBirth', 'user.ethnicity', 'user.gender', 'user.residency'];
	const actionReadOnly = [
		"user.fullName",
		"user.preferredName",
		"user.phoneNumber",
	];


	/**
	 * Returns true if the error from a request is status code over 500
	 * @param {Error} e
	 * @returns {boolean}
	 */
	function canRetryRequest(e) {
		return (get(e, 'response.statusCode') || get(e, 'response.status', 0)) > 500;
	}

	const wait = (millis) => new Promise(resolve => setTimeout(resolve, millis));

	async function doRetry({ promise, resolve, reject, fn, maxAttempts, name }) {
		let result;
		do {
			promise.attempts += 1;
			try {
				result = await fn();
				promise.state = "ok";
				resolve(result);
				return;
			} catch (error) {
				let shouldRetry = true;
				if (promise.attempts < maxAttempts) {
					shouldRetry = canRetryRequest(error);
				}
				if (!shouldRetry) {
					promise.state = "failed";
					promise.error = error;
					reject(error);
					return;
				}
				console.log(
					`${
						options.name
					} encountered retriable error, retrying`,
					error
				);
				// If we're retrying, don't slam the server, pause for up to 3 seconds
				await wait(3000 * Math.random());
			}
		} while (
			promise.state === "working" &&
			promise.attempts < maxAttempts
		);
	}

	/**
	 * Helper retries a function that perform an async operation up to 3
	 * times. It also decorates the returned promise with information
	 * on the state of the promise and the name of the action
	 * @param {*} fn
	 * @param {*} options
	 */
	function retry(fn, options = {}) {
		const maxAttempts = options.maxAttempts || 3;
		let resolve;
		let reject;
		const promise = new Promise(async (res, rej) => {
			resolve = res;
			reject = rej;
		});
		promise.name = options.name;
		promise.state = 'working';
		promise.attempts = 0;

		doRetry({
			promise,
			resolve,
			reject,
			fn,
			maxAttempts,
			name
		}).catch(e => {
			console.error('Unexpected retry failure', e);
			reject(e);
		});

		return promise;
	}

	async function awaitRetriables(list, onChange) {
		let incomplete;
		let error;
		do {
			incomplete = list.filter(p => p.state === 'working');
			if (incomplete.length) {
				try {
					await Promise.race(incomplete);
				} catch (e) {
					error = e;
				}
				onChange();
			}
		} while (incomplete.length);
		if (error) throw error;
	}

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
			this.testCanSave();
		}

		getRsvpUuid() {
			return get(this.props, `match.params.rsvp`);
		}

		prepareSteps() {
			if (!Conversation) Conversation = ConversationRef().html;

			// Show all questions in the pre survey
			const preSurveyQuestions = [
				"user.nycConsent",
				{
					interactionCategory: Conversation.surveyCategories()
						.preSurvey
				},
				{ sourceFieldId: "user.dateOfBirth" },
				{
					sourceFieldId: "user.residency",
					type: "select",
					options: [
						{ label: "Singapore Citizen", value: "citizen" },
						{
							label: "Permanent Resident",
							value: "permanent resident"
						},
						{
							label: "Employment Pass",
							value: "employment pass"
						},
						{ label: "Other", value: "Other" }
					]
				},
				{ sourceFieldId: "user.ethnicity" },
				{ sourceFieldId: "user.gender" },
			];
			// Show all questions in the post survey
			const postSurveyQuestions = [
				{
					interactionCategory: Conversation.surveyCategories()
						.postSurvey,
					exclude: [
						"research",
						"fundraise",
						"host",
						"volunteer",
						"hostCorporate",
						"facilitate"
					]
				}
			];

			const guestAction = [
				{ sourceFieldId: "user.fullName" },
				{ sourceFieldId: "user.preferredName" },
				{ sourceFieldId: "user.email", required: false },
				{ sourceFieldId: "user.phoneNumber", required: false },
				"user.postcode",
				{
					interactionCategory: Conversation.surveyCategories()
						.postSurvey,
					include: [
						"host",
						"facilitate",
						"volunteer",
						"hostCorporate",
						"research",
						"fundraise"
					]
				}
			];

			const allSteps = [
				{ title: "Pre-Survey", fields: preSurveyQuestions },
				{ title: "Post-Survey", fields: postSurveyQuestions },
				{ title: "Guest Action", fields: guestAction },
				{
					title: "Warning: Uncontactable",
					description: `This person has indicated interest in taking action with us
						but they have no email address. Follow up will be very limited.`,
					fields: [
						{
							id: "description-no-email",
							type: "rich-description",
							default: `
							<p>Do you want to go back and enter an email for them?</p>
							<p>(Maybe you can message the host to ask
								if they want to share their email with us?)</p>`
						}
					],
					condition: fields => {
						const takeAction = actionFields.reduce(
							(result, field) =>
								result ||
								get(fields, `2.private.${field}`, false),
							false
						);
						return takeAction && !get(fields, "2.email");
					}
				},

			];
			// Only show this step during initial data entry
			// let any updates be made on the conversation page
			if (!this.getRsvpUuid()) {
				allSteps.push(
					{ title: "Donation", fields: guestDonation },
				{
					title: "Conversation Date",
					description:
						"Did you set a tentative date with them to host a conversation? (leave blank if you didn't)",
					fields: conversationDate,
					condition: fields => get(fields, "2.private.host")
				});
			} else {
				// This are read-only for updates, display them, but as disabled
				const setReadOnlyFields = (list, ids) => {
					list.forEach(q => {
						const isString = typeof q === 'string';
						const name = isString ? q : q.sourceFieldId;
						if (ids.includes(name)) {
							if (isString) {
								console.error('Error preparing read only field update');
								console.error(`Please change field ${q} initial config to { sourceFieldId: '${q}' } so it can`)
								console.error('be updated')
								throw new Error(`Bad configuration for field ${q}`);
							}
							q.disabled = true;
						}
					});
				}
				setReadOnlyFields(preSurveyQuestions, preSurveyReadOnly);
				setReadOnlyFields(guestAction, actionReadOnly);
			}
			return allSteps;
		}

		load = async ({ dataToForm }) => {
			if (!UserSaveHelper) UserSaveHelper = UserSaveHelperRef().html;

			const eventUuid = get(this.props, "match.params.conversation");

			// Support editing a user
			const rsvpUuid = this.getRsvpUuid();
			let event;

			if (rsvpUuid) {
				if (!Conversation) Conversation = ConversationRef().html;
				const surveyCategories = Conversation.surveyCategories();

				const eventRsvp = await UserSaveHelper.proxy(
					`/event_rsvps/${rsvpUuid}?private=1`,
					{ method: "GET" }
				);
				const eventPromise = UserSaveHelper.proxy(
					`/events/${eventRsvp.eventUuid}?private=1`,
					{ method: "GET" }
				);

				this.setState({ eventUuid: eventRsvp.eventUuid, userUuid: eventRsvp.userUuid });

				const interactionPromises = [
					surveyCategories.preSurvey,
					surveyCategories.postSurvey,
					"host-interest"
				].map(category =>
					UserSaveHelper.proxy("/interactions", {
						method: "GET",
						query: {
							category,
							private: 1,
							user: eventRsvp.userUuid,
							["detail.private.conversationUuid"]: eventUuid
						}
					})
				);

				const promises = [
					// Load User
					getData(
						api.users.get({
							id: eventRsvp.userUuid,
							query: { private: 1 }
						})
					),
					...interactionPromises
				];
				const [user] = await Promise.all(
					promises
				);
				event = await eventPromise;
				const interactions = (await Promise.all(
					interactionPromises
				)).reduce((all, x) => all.concat(x), []);
				const records = {
					user,
					rsvp: eventRsvp,
					interactions,
				};
				this.setState({ records, event });
				return dataToForm(records);
			}

			if (!event) {
				const event = await Conversation.loadConversation(
					{
						props: this.props,
						required: true,
						private: true
					}
				);
				this.setState({
					event,
					eventUuid
				});
			}

			return null;
		};

		save = async (values, formToData) => {
			const { eventUuid, event } = this.state;
			const data = formToData(values);
			const facilitatorUuid = this.props.global.user.uuid;
			const campaignUuid = this.props.global.campaign.uuid;

			if (!Conversation) Conversation = ConversationRef().html;
			const surveyCategories = Conversation.surveyCategories();
			const surveys = [
				surveyCategories.preSurvey,
				surveyCategories.postSurvey
			];

			const saveProgress = [];
			this.setState({ saving: true, saveProgress });

			try {
				// Copy interaction host, vol, facil over to user record
				actionFieldsToUser.forEach(field => {
					const value = get(
						data,
						`interaction.${
							surveyCategories.postSurvey
						}.detail.private.${field}`
					);
					if (value) {
						set(data, `user.private.${field}`, value);
					}
				});
				// Mark them having attended a conversation
				set(data, "user.private.attendedConversation", true);

				console.log("Saving survey. Form data:", data);

				// If they've filled out the CTA with their email, put them on the mailing list
				if (data.user.email) {
					set(data, "user.private.mailingList", true);
				}

				console.log("Upserting user", data.user);
				const userPromise = retry(
					() =>
						UserSaveHelper.upsertUser(data.user, {
							assignSelf: true,
							assignPointIfNew: true
						}),
					{
						name: "Save guest person record"
					}
				);
				saveProgress.push(userPromise);
				const user = await userPromise;
				// temporary fix for upsert not returning an email
				if (!user.email) user.email = data.user.email;

				const interactionBase = {
					recordUuid: eventUuid,
					recordType: "event",
					userUuid: user.uuid
				};

				// Associate surveys with conversation and user
				const promises = surveys
					.map(survey => {
						const record = get(data, `interaction.${survey}`);
						if (!record) return null;
						return Object.assign(record, {
							...interactionBase,
							// Set the interaction type
							categoryUuid: survey
						});
					})
					.filter(s => s)
					.map(record => {
						record.detail.readOnly = false;
						record.detail.occurredAt = event.startAt;
						console.log(
							`Saving survey ${record.categoryUuid}`,
							record
						);
						return this.upsertInteraction(record);
					});
				saveProgress.push(...promises);

				if (
					get(
						data,
						`interaction.${
							surveyCategories.postSurvey
						}.detail.private.host`
					)
				) {
					const hostData = {
						...interactionBase,
						categoryUuid: "host-interest",
						detail: {
							occurredAt: event.startAt,
							private: {
								facilitatorUuid,
								status: "lead",
								source: "conversation",
								conversationUuid: eventUuid
							}
						}
					};
					console.log("Saving host", hostData);
					saveProgress.push(this.upsertInteraction(hostData));
				}

				// eslint-disable-next-line camelcase
				if (!data.event_rsvp) data.event_rsvp = {};
				Object.assign(data.event_rsvp, {
					userUuid: user.uuid,
					type: "guest",
					eventUuid,
				});

				console.log("Saving guest rsvp", data.event_rsvp);
				const rsvpPromise = this.upsertRsvp(data.event_rsvp, {
					existing: get(this, "state.records.rsvp")
				});
				saveProgress.push(rsvpPromise);

				// Save donation / donation intention
				const cashPaymentType = get(
					data,
					"event_rsvp.private.donationIntention"
				);
				if (["transfer", "cash"].includes(cashPaymentType)) {
					const donation = {
						campaignUuid: websiteCampaignUuid,
						profileUuid: websiteProfileUuid,
						userUuid: user.uuid,
						anonymous: true,
						mode: "LIVE",
						type: "OFFLINE",
						method: "OFFLINE",
						amount: get(
							data,
							"event_rsvp.private.donationAmount"
						),
						email: user.email,
						private: {
							conversationUuid: eventUuid,
							cashPaymentType
						},
						currency: "SGD"
					};
					console.log("Saving donation", donation);
					saveProgress.push(this.upsertDonation(donation));
				}

				// Add the future conversation
				// This step is only included for new records
				// we won't update a conversation
				if (get(data, "event.startAt")) {
					data.event.campaignUuid = campaignUuid;
					this.createConversation(
						data.event,
						user,
						facilitatorUuid,
						saveProgress
					);
				}

				rsvpPromise.then(rsvp => this.setState({ rsvpUuid: rsvp.uuid }));

				const savedRsvp = await rsvpPromise;
				this.setState({ rsvpUuid: savedRsvp.uuid });

				const rsvp = get(data, "event_rsvp");
				const rsvpUuid = savedRsvp.uuid;
				rsvp.uuid = rsvpUuid;

				const webhookData = {
					type: "guest.created",
					data: {
						user,
						preSurvey: get(
							data,
							`interaction.${
								surveyCategories.preSurvey
							}.detail`
						),
						postSurvey: get(
							data,
							`interaction.${
								surveyCategories.postSurvey
							}.detail`
						),
						conversation: this.state.event,
						rsvp
					}
				};
				console.log(
					"Sending to conversation-sync webhook",
					webhookData
				);
				// Send the guest to be added to the backend spreadsheet
				saveProgress.push(retry(() =>
					UserSaveHelper.doFetch(WEBHOOK_URL, {
						method: "post",
						body: {
							data: webhookData
						}
					}),
					{ name: 'Sync with spreadsheet' }));

				// Wait for promises to complete
				// whenever one changes, update state so
				// changes are reflected
				await awaitRetriables(saveProgress, () => {
					this.setState({ saveProgress: [...saveProgress] });
				});
				this.setState({ finished: true, saving: false });
			} catch (error) {
				console.error(error);
				this.setState({ saveError: error, saveProgress: [...saveProgress] });

				// Continue to wait for retriables to complete
				await awaitRetriables(saveProgress, () => {
					this.setState({ saveProgress: [...saveProgress] });
				});
			}
		};

		upsertRsvp(rsvp, { existing, create }) {
			if (!create) {
				if (existing)
					return retry(
						() =>
							UserSaveHelper.proxy(`/event_rsvps/${existing.uuid}`, {
								method: "PATCH",
								body: { data: rsvp }
							}),
						{ name: "Updating guest RSVP" }
					);
			}

			return retry(
				() =>
					UserSaveHelper.proxy("/event_rsvps", {
						method: "POST",
						body: { data: rsvp }
					}),
				{ name: "Saving guest RSVP" }
			);
		}

		createConversation(
			eventDetails,
			user,
			facilitatorUuid,
			saveProgress
		) {
			if (!Conversation) Conversation = ConversationRef().html;
			const fullEventDetails = Object.assign(
				{
					name: Conversation.defaultName([user])
				},
				eventDetails
			);

			console.log(
				"Creating tentative new conversation",
				fullEventDetails
			);

			const promise = retry(() =>
				UserSaveHelper.proxy("/events", {
					method: "POST",
					body: { data: fullEventDetails }
				}), {
					name: 'Book tentative conversation',
				}
			);
			saveProgress.push(promise);
			promise
				// Add the facil and host to the conversation
				.then(event => {
					const hostRsvp = {
						type: "host",
						userUuid: user.uuid,
						eventUuid: event.uuid
					};
					const facilitatorRsvp = {
						type: "facilitator",
						userUuid: facilitatorUuid,
						eventUuid: event.uuid
					};

					console.log(
						"Assigning host and facilitator to conversation",
						hostRsvp,
						facilitatorRsvp
					);
					saveProgress.push(
						retry(() =>
							this.upsertRsvp(hostRsvp, { create: 1 }),
						{ name: "Add host to booking" }
					));
					saveProgress.push(
						retry(() =>
							this.upsertRsvp(facilitatorRsvp, { create: 1 }),
						{ name: "Add facilitator to booking" }
					));
				});
		}
		upsertDonation(donation) {
			const existingDonation = get(this.state, 'records.donation');
			const promises = [];

			if (existingDonation) {
				// Raisely doesn't permit updating a donation amount
				// If we're not updating that, then we can just to an update
				if (existingDonation.amount === donation.amount) {
					return retry(
						() =>
							UserSaveHelper.proxy(
								`/donations/${existingDonation.uuid}`,
								{
									method: "POST",
									body: {
										data: donation
									}
								}
							),
						{ name: "Update donation" }
					);
				}
				mustDelete = true;

				// Otherwise we need to delete the old one and replace it
				promises.push(
					retry(() =>
						UserSaveHelper.proxy(
							`/donations/${existingDonation.uuid}`,
							{
								method: "DELETE"
							}
						)
					)
				);
			}

			promises.push(
				retry(() =>
					UserSaveHelper.proxy("/donations", {
						method: "POST",
						body: {
							data: donation
						}
					})
				)
			);
			return retry(() => Promise.all(promises), {
				name: "Save donation",
				maxAttempts: 1
			});
		}
		upsertInteraction(record) {
			const existingInteractions = get(
				this.state, 'records.interactions'
			);
			if (existingInteractions) {
				const found = existingInteractions.find(
					i => i.category.path === record.categoryUuid
				);
				if (found) {
					return retry(
						() =>
							UserSaveHelper.proxy(
								`/interactions/${found.uuid}`,
								{
									method: "PUT",
									body: {
										data: { detail: record.detail }
									}
								}
							),
						{ name: `Updating ${record.categoryUuid}` }
					);
				}
			}
			// We always want our interactions to be updatable
			record.detail.readOnly = false;
			return retry(
				() =>
					UserSaveHelper.proxy("/interactions", {
						method: "POST",
						body: { data: record }
					}),
				{
					name: `Saving ${record.categoryUuid}`
				}
			);
		}

		/**
		 * Tests that the users token has permission to save to
		 * the webhook url so we find out *before* they do the
		 * data entry
		 */
		async testCanSave() {
			const { hookSuccessful, webhookError, testingSave } = this.state;
			if (hookSuccessful || webhookError || testingSave) return;
			try {
				const token = getCurrentToken();
				// ComponentDidMount gets called twice, once before
				// props have finished loading
				// don't send a request without a token
				if (!token) {
					console.log("Aborting save check, no token");
					return;
				}

				if (!get(this.props, "global.user")) {
					console.log("Aborting save check, no user", {
						...this.props
					});
					return;
				}

				this.setState({ testingSave: true });

				const tags = get(this.props, "global.user.tags", []);
				if (
					!tags.find(tag =>
						["team-leader", "facilitator"].includes(tag.path)
					)
				) {
					throw new Error(
						"You don't appear to be a facilitator or team leader"
					);
				}

				await UserSaveHelper.doFetch(WEBHOOK_URL, {
					method: "post",
					body: {}
				});
			} catch (e) {
				console.error(e);
				this.setState({
					webhookError: e,
					message: e.message || "(Unknown Error)"
				});
			}
			this.setState({ hookSuccessful: true });
		}

		saving() {
			const descriptions = {
				user: "guest details",
				survey: "survey",
				donation: "cash donation",
				intention: "donation intention",
				conversation: "new conversation",
				demographics: "demographics"
			};

			let hasError = false;
			let details;

			if (this.state.saving) {
				details = this.state.saving.map(setting => {
					if (setting.message) hasError = true;
					const status = setting.message || "OK";
					return (
						<p key={setting}>
							Saving {descriptions[setting.id]} ... {status}
						</p>
					);
				});
			}

			return hasError ? details : <p>Saving guest details</p>;
		}

		renderSaving = () => {
			const { saveError, saveProgress } = this.state;
			const completeSteps = saveProgress.filter(p => p.state === 'ok').length;
			const inProgress = saveProgress.filter(p => (p.state === 'working') && (p.attempts > 1));
			let description = '';
			const errors = saveProgress.filter(p => p.error);

			if (saveError && !errors.find(p => p.error === saveError)) {
				errors.unshift({ name: 'General Error', error: saveError });
			}

			const stateIcons = {
				failed: "❌",
				ok: "✔️",
				working: "•"
			};

			if (inProgress.length) {
				const recent = inProgress.reverse()[0];
				description = `${recent.name} (${recent.attempts})`;
			}

			console.log(saveProgress, errors.length, completeSteps)

			return (
				<div className="guest-data__save-progress">
					<h4>Saving Guest</h4>
					{errors.length ? (
						<div>
							<div className="save-notice">
								<p>
									There's been a problem saving this guest
									record.
								</p>
								<p>
									Please take a screenshot of this screen and
									send it to a team leader or coordinator for
									help.
								</p>
							</div>
							<ul className="save-status">
								{saveProgress.map(p => (
									<li>
										<span
											className={`save-progress__icon--${
												p.state
											}`}
										>
											{stateIcons[p.state]}
										</span>
										{p.name}
									</li>
								))}
							</ul>
							<div className="save-errors">
								{errors
									.map(p => (
										<div className="error-item">
											<p class="item-name">{p.name}</p>
											<p className="item-stack">
												{p.error.stack}
											</p>
										</div>
									))}
							</div>
						</div>
					) : (
						<div>
							<ProgressBar
								displaySource="custom"
								total={completeSteps}
								goal={saveProgress.length}
								showTotal={false}
								showGoal={false}
								style="rounded"
								unit=" "
								size="medium"
							/>
							<div className="description">
								{description}
							</div>
							<Spinner />
						</div>
					)}
				</div>
			);
		};

		renderFinalPage = () => {
			const { rsvpUuid } = this.state;
			// Changing the key will cause react to re-fresh the component
			const reset = () =>
				this.setState({ key: new Date().toISOString() });
			const reviewLink = `/surveys/${rsvpUuid}`;

			return (
				<div>
					<p>Guest saved!</p>
					<div>
						<p>
							As this is the first conversation {"you've"}{" "}
							processed a conversation in the new system,
							could you do us a favour and review the saved
							details and check that everything was saved
							correctly?
						</p>
						<Button theme="cta" href={reviewLink}>
							Review Guest Details
						</Button>
					</div>
					<div>
						<Button theme="primary" onClick={reset}>
							Add another Guest
						</Button>
						<ReturnButton
							{...this.props}
							backTheme="secondary"
							backLabel="Go back"
							theme="secondary"
						>
							Go back to dashboard
						</ReturnButton>
					</div>
				</div>
			);
		};

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
							<Spinner
								className="spinner"
								sceneHeight="1rem"
								size="0.5"
							/>
							Verifying permission to save guests
						</p>
					)}
				</div>
			);
		}

		renderHint(isNew) {
			if (isNew) {
				return (
					<div className="hint">
						<p>
							<strong>Hint:</strong> To get throught your
							surveys faster, press <strong>Tab</strong>{" "}
							between fields and type in the answers.
						</p>
						<p>
							For scale fields, type in the number that was
							ticked.
						</p>
						<p>
							For multiple choice fields, press the down arrow
							or type the first few characters of the answer
							you want to choose
						</p>
						<p>
							For checkboxes press spacebar to check/uncheck
							the box
						</p>
						<p>
							(You can do this on all forms in the volunteer
							portal, not just this one)
						</p>
					</div>
				);
			}
			const { userUuid } = this.state;
			const readOnlyFields = [
				...preSurveyReadOnly,
				...actionReadOnly
			]
				.map(f => startCase(f.split('.')[1]))
				.join(', ');
			return (
				<div className="hint">
					<p>
						<strong>Note</strong> If you need to make changes to a {"person's "}
						{readOnlyFields} you'll need to edit the person's record in the
						Raisely Admin.
					</p>
					{userUuid && (
						<RaiselyButton label="Edit Person in Raisely" recordType="user" uuid={userUuid} style={{ marginTop: '10px' }} />
					)}
				</div>
			);
		}

		render() {
			const {
				error,
				webhookError,
				key,
				saving,
				finished
			} = this.state;

			if (webhookError) {
				return (
					<div className="guest-data-entry-wrapper" key={key}>
						<h4>Error!</h4>
						<p>
							Sorry, your account {"doesn't"} seem to have
							permission to save guest data.
						</p>
						<p>
							(We thought we should stop you now before you do
							all that typing)
						</p>
						<p>
							Please contact your team leader or program
							co-ordinator to resolve this
						</p>
						<p>The error is: {error}</p>
					</div>
				);
			}

			if (!UserSaveHelper) {
				UserSaveHelper = UserSaveHelperRef().html;
				({ actionFields } = UserSaveHelper);
			}

			if (finished) return this.renderFinalPage();
			if (saving) return this.renderSaving();

			return (
				<div className="guest-data-entry-wrapper" key={key}>
					{this.renderHint(!this.getRsvpUuid())}
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
