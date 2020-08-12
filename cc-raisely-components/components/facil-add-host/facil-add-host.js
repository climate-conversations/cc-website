/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const { api, Spinner } = RaiselyComponents;
	const { Button } = RaiselyComponents.Atoms;
	const { dayjs, get, pick, qs, set, startCase } = RaiselyComponents.Common;
	const { getData, save } = api;
	const { Modal } = RaiselyComponents.Molecules;

	const CustomForm = RaiselyComponents.import('custom-form');
	const UserSelect = RaiselyComponents.import('user-select');
	const RaiselyButton = RaiselyComponents.import('raisely-button');
	const Messenger = RaiselyComponents.import('message-send-and-save');
	const ReturnButtonComponent = RaiselyComponents.import('return-button');
	const ReturnButtonRef = RaiselyComponents.import('return-button', { asRaw: true });
	const UserSaveHelperRef = RaiselyComponents.import('cc-user-save', { asRaw: true });
	let ReturnButton;
	let UserSaveHelper;

	const userFields = [
		'user.preferredName', 'user.fullName', 'user.phoneNumber', 'user.email',
		'user.address1', 'user.address2', 'user.suburb', 'user.country', 'user.postcode',
	];
	const intentionFields = [
		'interaction.host-interest.status', 'interaction.host-interest.firstContactedAt', 'interaction.host-interest.source',
	];

	const editForm = [
		{ title: 'Edit Host Status', fields: intentionFields },
	];

	const getFacilitatorName = (facilitator) => get(facilitator, 'fullName') ||
		get(facilitator, 'preferredName', 'The facilitator');

	class FindHost extends React.Component {
		state = {};

		componentDidMount() {
			const { host } = this.props;
			// eslint-disable-next-line react/no-did-mount-set-state
			this.setState({ host });
		}

		createNew = () => {
			this.setState({ host: null }, this.props.next);
		}

		next = async () => {
			this.props.next();
		}

		updateHost = (user) => {
			const { pageIndex } = this.props;
			this.setState({ host: user }, () => {
				this.props.updateValues({ [pageIndex]: this.state.host });
			});
		}

		renderHost = () => {
			const host = this.state.host || this.props.host;

			if (host && host.uuid) {
				const name = host.fullName || host.preferredName;

				return (
					<div className="conversation-team__selected_user field-wrapper">
						<label htmlFor="host">
							<span className="form-field__label-text">Host</span>
						</label>
						<div className="user__card">
							<div className="static-field__title">{name}</div>
							<div className="static-field__subtitle">{host.email}</div>
							<RaiselyButton uuid={host.uuid} recordType="user" />
							<Button type="button" onClick={() => this.updateHost(null)}>Change</Button>
						</div>
					</div>
				);
			}

			return (
				<div className="conversation-team__user-select field-wrapper">
					<UserSelect
						api={api}
						global={this.props.global}
						update={({ user }) => this.updateHost(user)}
						label="Host"
					/>
				</div>
			);
		}

		render() {
			const { props } = this;
			const { host } = this.state;
			if (!ReturnButton) ReturnButton = ReturnButtonRef().html;

			return (
				<div className="custom-form__step">
					<div className="conversation-team custom-form__step-header">
						<div className="conversation-team__title">
							<h3>Find a Host</h3>
							<p>
								Type the name email or phone number of the host to find them, or
								click <strong>Add new person</strong> if {"they're"} not in our database.
							</p>
							<p>
								If the host is an organisation, enter the contact person as the host,
								then edit that person in Raisely and make sure {"they're"} associated with
								the organisation.
							</p>
						</div>
					</div>
					{this.renderHost()}
					<div className="custom-form__step-form">
						<div className="conversation-team__navigation custom-form__navigation">
							<ReturnButton {...props} backLabel="Go Back" />
							{host ? (
								<Button
									type="button"
									onClick={this.next}
									disabled={!host}
								>
									Next
								</Button>
							) : (
								<Button
									type="button"
									disabled={this.state.saving}
									onClick={this.createNew}
								>
									Add new Person
								</Button>
							)}
						</div>
					</div>
				</div>
			);
		}
	}

	function ViewInteraction({ interaction }) {
		const date = dayjs(interaction.createdAt).format('DD/MM/YYYY');
		const subject = get(interaction, 'detail.private.subject') ||
			`[${startCase(get(interaction, 'detail.private.messageId', ''))}]`;
		return (
			<li className="interaction--tile">
				<div className="interaction--tile__date">{date}</div>
				<div className="interaction--subject">{subject}</div>
			</li>
		);
	}

	class HostInteractions extends React.Component {
		state = { loading: true };
		componentDidMount() {
			this.load();
		}

		componentDidUpdate(prevProps) {
			const { interaction: oldInteraction, host: oldHost } = prevProps;
			const { interaction, host } = this.props;

			if ((oldInteraction !== interaction) || (oldHost !== host)) {
				this.load();
			}
		}

		load = async () => {
			const { host } = this.props;
			const messageCategories = 'meeting,personal.message,personal.email,phone';
			this.setState({ loading: true });

			try {
				if (!UserSaveHelper) UserSaveHelper = UserSaveHelperRef().html;
				const query = qs.stringify( {
					user: host.uuid,
					category: messageCategories,
					limit: 10,
					private: 1,
				});

				// Work around API throwing 500 when the results are empty
				let messages = [];
				const initStepsPromise = this.initSteps();
				try {

					[messages] = await Promise.all([
						UserSaveHelper.proxy(`/interactions?${query}`, {
							method: 'get',
						}),
					]);
				} catch (error) {}
				// In case the other failed
				await initStepsPromise;
				console.log("messages: ", messages)
				this.setState({ messages }, this.checkCompleteSteps);
			} catch (error) {
				console.error(error);
				this.setState({ error: error.message || 'Loading failed', loading: false });
			} finally {
				this.setState({ loading: false });
			}
		}

		/**
		 * Copy messaging steps from campaign
		 * Note which steps are complete and overdue
		 */
		async initSteps() {
			const campaignUuid = get(this.props, 'global.campaign.uuid');
			if (!UserSaveHelper) UserSaveHelper = UserSaveHelperRef().html;
			const privateCampaign = await UserSaveHelper.proxy(`/campaigns/${campaignUuid}?private=1`, {
				method: 'get',
			});

			const grace = 48; // hours
			const now = dayjs();

			const { interaction } = this.props;
			const completedSteps = this
				.deserializeCompleteSteps(get(interaction, 'detail.private.followUpSteps', ''));

			// Clone steps and set calculated attributes
			const steps = get(privateCampaign, 'private.hostMessages', [])
				.map((s) => {
					const step = { ...s };
					const field = step.sendAfter.field || 'createdAt';
					step.dueBy = dayjs(get(interaction, field))
						.add(step.sendAfter.value, step.sendAfter.period)
						// Give a grace for completing the step
						.add(grace, 'hours');
					step.complete = !!completedSteps[step.id];
					step.overdue = !step.complete && step.dueBy.isBefore(now);
					step.about = startCase(step.id);
					return step;
				});
			this.setState({ steps, completedSteps });
		}

		deserializeCompleteSteps(steps) {
			const completedSteps = {};
			steps
				.split('\n')
				.forEach((step) => {
					const [createdAt, onTime, id] = step.split('\t');
					completedSteps[id] = { id, onTime, createdAt };
				});
			return completedSteps;
		}

		serializeCompleteSteps() {
			const { completedSteps } = this.state;
			return Object.values(completedSteps)
				.map(({ id, onTime, createdAt }) => `${createdAt}	${onTime}	${id}`)
				.sort()
				.join('\n');
		}

		manualStep = async () => {
			const { sendBy } = this.state.nextStep;
			const { host } = this.props;
			const newInteraction = {
				userUuid: host.uuid,
				categoryUuid: sendBy === 'email' ? 'personal.email' : 'personal.message',
				detail: {
					readOnly: false,
					private: {
						...this.getNextStepMeta(),
						method: sendBy
					},
				},
			};
			await getData(
				save("interaction", newInteraction)
			);
			this.load();
		}

		checkCompleteSteps = async () => {
			const { updateInteraction, interaction } = this.props;
			const { messages, steps, completedSteps } = this.state;

			if (!get(interaction, 'detail.private.followUpCompletedAt')) {
				try {
					let changed;

					messages.forEach((message) => {
						const type = get(message, 'detail.private.forInteraction');
						const stepId = get(message, 'detail.private.messageId');
						if ((type === 'host-interest') && stepId && !completedSteps[stepId]) {
							changed = true;
							const occurredAt = dayjs(message.createdAt);
							const step = steps.find(({ id }) => id === stepId);

							step.complete = true;
							completedSteps[stepId] = {
								id: stepId,
								date: occurredAt.toISOString(),
								onTime: occurredAt.isBefore(step.dueBy) ? 'onTime' : 'late',

							};
						}
					});

					const numOnTime = Object.values(completedSteps)
						.map(step => ((step.onTime === 'onTime') ? 1 : 0))
						.reduce((val, total) => total + val, 0);
					const complete = (numOnTime * 100) / steps.length;

					set(interaction, 'detail.private.followUpPercentComplete', complete);
					set(interaction, 'detail.private.followUpSteps', this
						.serializeCompleteSteps(Object.values(completedSteps)));
					if (complete >= 100) {
						changed = true;
						set(interaction, 'detail.private.followUpCompletedAt', dayjs().toISOString());
					}

					if (changed) {
						this.setState({ saving: true });
						await updateInteraction(interaction);
					}
					this.setState({ saving: false }, this.nextStep);
				} catch (error) {
					console.error(error);
					this.setState({ error: `Could not update: ${error.message}`, saving: false });
				}
			}
		}

		nextStep = () => {
			const { steps } = this.state;
			const remaining = steps
				.filter(step => !step.complete)
				.sort((a, b) => (a.dueBy.isBefore(b.dueBy) ? 1 : -1));

			// Choose the next remaining step
			let nextStep = remaining[0];
			// If multiple steps are overdue, select the last
			remaining.find((step) => {
				if (step.overdue) return true;
				nextStep = step;
				return false;
			});
			this.setState({ nextStep });
		}

		getNextStepMeta() {
			let nextStepMeta;
			const { nextStep } = this.state;
			if (nextStep) {
				nextStepMeta = {
					forInteraction: 'host-interest',
					messageId: nextStep.id,
				}
				pick(nextStep, ['']);
			}
			return nextStepMeta;

		}

		render() {
			// eslint-disable-next-line object-curly-newline
			const { messages, loading, error, nextStep } = this.state;
			const { host, interaction, facilitator } = this.props;
			if (!(host || interaction)) return '';
			if (loading) return <Spinner />;
			const nextStepMeta = this.getNextStepMeta();

			const noun = get(facilitator, 'uuid', 'n/a') === get(this.props, 'global.user.uuid') ?
				'You' : getFacilitatorName(facilitator);

			if (error) {
				return (
					<div className="host--interactions__wrapper">
						<div className="error">
							<p>{error}</p>
						</div>
					</div>
				);
			}

			const messageData = {
				sender: get(this.props, 'global.user'),
			};

			return (
				<div className="host--interactions__wrapper">
					{nextStep ? (
						<div className="host--interactions__next-message">
							{noun} should {nextStep.overdue ? 'have sent' : 'send'} {host.preferredName} a message
							around {nextStep.dueBy.format('MMM D (dddd)')} about {nextStep.about}
							<Messenger
								{...this.props}
								to={[host]}
								subject={nextStep.subject}
								body={nextStep.body}
								sendBy={nextStep.sendBy}
								launchButtonLabel="Send Now"
								onClose={this.load}
								messageMeta={nextStepMeta}
								messageData={messageData}
							/>
							<Button onClick={this.manualStep}>{"I've"} already done this</Button>
						</div>
					) : <Messenger
						{...this.props}
						to={[host]}
						subject='Hosting'
						body={`Hi ${host.preferredName}`}
						sendBy='whatsapp'
						launchButtonLabel="Message Host"
						onClose={this.load}
						messageData={messageData}
					/>}
					<div className="host--interactions__list">
						<h4>Recent Messages</h4>
						{messages && messages.length ? (
							<ol>
								{messages.map(message => <ViewInteraction key={message.uuid} interaction={message} />)}
							</ol>
						) : (
							<p>We {"haven't"} recorded any messages to this host yet</p>
						)}
						View all interactions with the host in Raisely <RaiselyButton recordType="user" uuid={host.uuid} label="View Host" />
					</div>
					<div>
						<ReturnButtonComponent
							{...this.props} saveTheme="secondary" saveLabel="Return to Dashboard"
						/>
					</div>
				</div>
			);
		}
	}

	class ReassignHost extends React.Component {
		save = async () => {
			const { reassign, closeModal } = this.props;
			const { newFacilitator } = this.state;
			this.setState({ saving: true });
			try {
				await reassign(newFacilitator);
			} catch (error) {
				this.setState({ error: error.message });
				console.error(error);
			} finally {
				this.setState({ saving: false });
			}
			closeModal();
		}

		selectAssignee = () => {
			const { closeModal } = this.props;

			const { newFacilitator, saving } = this.state;

			if (newFacilitator && newFacilitator.uuid) {
				const name = newFacilitator.fullName || newFacilitator.preferredName;

				return (
					<div className="conversation-team__selected_user field-wrapper">
						<label htmlFor="facilitator">
							<span className="form-field__label-text">Assign to</span>
						</label>
						<div className="user__card">
							<div className="static-field__title">{name}</div>
							<div className="static-field__subtitle">{newFacilitator.email}</div>
							<RaiselyButton uuid={newFacilitator.uuid} recordType="people" />
							<Button type="button" onClick={() => this.setState({ newFacilitator: null })}>Change</Button>
						</div>
					</div>
				);
			}

			return (
				<div className="assignment-select">
					<div className="conversation-team__user-select field-wrapper">
						<UserSelect
							api={api}
							global={this.props.global}
							update={({ user }) => this.setState({ newFacilitator: user })}
							label="Assign to"
						/>
					</div>
					<Button disabled={saving} onClick={closeModal()}>Cancel</Button>
					<Button disabled={saving || !newFacilitator} onClick={this.save()}>Confirm</Button>
				</div>
			);
		}

		render() {
			const { error } = this.state;
			return (
				<div className="assignment-select__wrapper">
					{error ? (
						<div className="error">
							{error}
						</div>
					) : ''}
					Choose a facilitator or team leader to reassign the host to
					{this.selectAssignee()}
				</div>
			);
		}
	}

	class EditButtons extends React.Component {
		state = {};

		next = async () => {
			console.log('FormStep.next');
			const { save, shouldSave } = this.props;
			if (shouldSave) {
				this.setState({ saving: true });
				try {
					await save();
				} catch (e) {
					// Save function handles the error, we just need
					// to avoid advancing the form
					return;
				} finally {
					this.setState({ saving: false });
				}
			}
			this.props.next();
		}

		book = () => {
			const { host } = this.props;
			if (!ReturnButton) ReturnButton = ReturnButtonRef().html;
			const bookingUrl = ReturnButton.forwardReturnTo({
				props: this.props,
				url: `/conversations/create?host=${host.uuid}`,
			});
			this.props.history.push(bookingUrl);
		}

		reassign = (closeModal) => {
			return <ReassignHost {...this.props} closeModal={closeModal} />;
		}

		render() {
			const { back } = this.props;

			return (
				<div className="host--form__buttons">
					<Button
						type="button"
						onClick={this.book}
						disabled={this.state.saving}
					>
						Book a Conversation
					</Button>
					<Modal
						button
						buttonTitle="Reassign Host"
						modalContent={this.reassign}
					/>
					<div className="custom-form__navigation">
						{ this.props.step < 1 ? '' : (
							<Button
								type="button"
								disabled={this.state.saving}
								onClick={back}
							>
								Back
							</Button>
						)}
						<Button
							type="button"
							onClick={this.next}
							disabled={this.state.saving}
						>
							{this.state.saving ? 'Saving...' : 'Save'}
						</Button>
					</div>
				</div>
			);
		}
	}

	return class FacilAddHost extends React.Component {
		state = { mode: 'edit' };

		componentDidMount() {
			this.setForm();
		}

		setForm = () => {
			const { mode, host, facilitator } = this.state;
			const facilName = getFacilitatorName(facilitator);

			if (host) {
				editForm[0].description = (
					<React.Fragment>
						<div className="host--form__name">{host.fullName || host.preferredName}</div>;
						<div className="host--form__facilitator">Assigned to {facilName}</div>
					</React.Fragment>
				);
			}

			if (mode === 'new') {
				const newForm = [
					{ title: 'Find Person', component: FindHost },
					{ title: 'Add New Person (Host)', fields: userFields, condition: values => !get(values, '0.uuid') },
					{ title: 'Edit Host Status', fields: intentionFields, buttons: EditButtons },
				];

				this.setState({ form: newForm });
			} else {
				editForm[0].buttons = EditButtons;
				this.setState({ form: editForm, showInteractions: true });
			}
		}

		load = async ({ dataToForm }) => {
			// Load event and rsvps
			const results = await api.quickLoad({ props: this.props, models: ['interaction.private'], required: false });
			const { interaction } = results;

			// We must be creating a new host
			if (!interaction) {
				this.setState({ mode: 'new', interaction }, this.setForm);
				return {};
			}

			const host = interaction.user;
			this.setState({ mode: 'edit', interaction, host });

			const facilitatorUuid = get(interaction, 'detail.private.facilitatorUuid');
			if (facilitatorUuid) {
				getData(api.users.get({ id: facilitatorUuid }))
					.then(facilitator => this.setState({ facilitator }))
					.catch(console.error);
			}

			return dataToForm({ interaction: {
				[interaction.category.path]: interaction,
			} });
		}

		save = async (values, formToData) => {
			const data = formToData(values);
			if (!UserSaveHelper) UserSaveHelper = UserSaveHelperRef().html;

			let { host } = this.state;
			if (data.user) {
				host = await UserSaveHelper.upsertUser(data.user, { assignSelf: true, assignPointIfNew: true });
				this.setState({ host });
			}

			if (!host) host = values[0];
			let { interaction: oldInteraction } = this.state;

			let newInteraction = data.interaction['host-interest'];
			if (!oldInteraction) {
				const facilitatorUuid = get(this.props, 'global.user.uuid');
				oldInteraction = {
					userUuid: host.uuid,
					categoryUuid: 'host-interest',
					detail: {
						private: {
							facilitatorUuid: facilitatorUuid,
						},
					},
				};
			}
			newInteraction = {
				...oldInteraction,
				...newInteraction,
			};
			newInteraction.readOnly = false;
			newInteraction.detail.private = {
				...oldInteraction.detail.private,
				...get(newInteraction, "detail.private", {})
			};

			const interaction = await getData(save('interaction', newInteraction, { partial: true }));
			if (!ReturnButton) ReturnButton = ReturnButtonRef().html;
			const nextUrl = ReturnButton.forwardReturnTo({ props: this.props, url: `/hosts/${get(interaction, 'uuid')}` });
			this.props.history.push(nextUrl);
		}

		reassign = async (newFacilitator) => {
			const { host } = this.state;
			const assignment = [{ recordType: 'user', recordUuid: host.uuid }];
			const { interaction } = this.state;

			await Promise.all([
				UserSaveHelper.proxy(`/interactions/${interaction.uuid}`, {
					method: 'PATCH',
					body: {
						data: {
							detail: { private: { facilitatorUuid: newFacilitator.uuid } },
						},
						partial: true,
					}
				}),
				UserSaveHelper.assignUser(newFacilitator.uuid, host.uuid),
			]);
			set(interaction, 'detail.private.facilitatorUuid', newFacilitator.uuid);
			this.setState({ facilitator: newFacilitator });
		}

		updateInteraction = async (interaction) => {
			if (!UserSaveHelper) UserSaveHelper= UserSaveHelperRef().html
			const data = { ...interaction };
			delete data.uuid;
			await UserSaveHelper.proxy(`/interactions/${interaction.uuid}`, {
				method: 'PATCH',
				body: { data },
			});

			await save('interaction', interaction, { partial: true });
			this.setState({ interaction });
		}

		updateStep = (step, values) => {
			const host = get(values, '0.host');
			if (host) {
				this.setState({ host }, this.setForm);
			}
		}

		render() {
			// eslint-disable-next-line object-curly-newline
			const { form, host, interaction, facilitator, mode, showInteractions } = this.state;

			if (!form) return <Spinner />

			const formSettings = {
				host,
				...this.props,
				steps: form,
				controller: this,
				reassign: this.reassign,
			};

			if (mode !== 'new') {
				formSettings.redirectToReturnTo = true;
			}

			const hostName = get(host, 'fullName') ||
				get(host, 'preferredName') ||
				get(host, 'phoneNumber') ||
				get(host, 'email');
			let formClass = `host-edit__form ${showInteractions ? 'split__screen' : ''}`;
			let interactionsClass = `host-edit__interactions ${showInteractions ? 'split__screen' : ''}`;

			return (
				<div className="host-edit__wrapper">
					<div className="host-edit__header">
						<h4>{hostName}</h4>
					</div>
					<div className="host-edit__content">
						<div className={formClass}>
							<CustomForm {...formSettings} />
						</div>
						{(showInteractions && host) ? (
							<div className={interactionsClass}>
								<HostInteractions
									{...this.props}
									host={host}
									interaction={interaction}
									facilitator={facilitator}
									updateInteraction={this.updateInteraction}
								/>
							</div>
						) : ''}
					</div>
				</div>
			);
		}
	};
};
