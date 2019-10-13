/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const { api, Spinner } = RaiselyComponents;
	const { Button } = RaiselyComponents.Atoms;
	const { dayjs, get, set } = RaiselyComponents.Common;
	const { getData, save } = api;
	const { Modal } = RaiselyComponents.Molecules;

	const CustomForm = RaiselyComponents.import('custom-form');
	const UserSelect = RaiselyComponents.import('user-select');
	const RaiselyButton = RaiselyComponents.import('raisely-button');
	const Messenger = RaiselyComponents.import('message-send-and-save');
	const ReturnButton = RaiselyComponents.import('return-button', { asRaw: true });
	const UserSaveHelper = RaiselyComponents.import('cc-user-save', { asRaw: true });

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
							<RaiselyButton uuid={host.uuid} recordType="people" />
							<Button type="button" onClick={() => this.updateHost(null)}>Change</Button>
						</div>
					</div>
				);
			}

			return (
				<div className="conversation-team__user-select field-wrapper">
					<UserSelect
						api={api}
						global={global}
						update={({ user }) => this.updateHost(user)}
						label="Host"
					/>
				</div>
			);
		}

		render() {
			const { props } = this;
			const { host } = this.state;

			return (
				<div className="custom-form__step">
					<div className="conversation-team custom-form__step-header">
						<div className="conversation-team__title">
							<h3>Find a Host</h3>
							<p>
								Type the name email or phone number of the host to find them, or
								click create person if {"they're"} not in our database.
							</p>
							<p>
								If the host is an organisation, enter the contact person,
								then edit that person in Raisely and make sure {"they're"} associated with
								the organisation.
							</p>
						</div>
					</div>
					{this.renderHost()}
					<div className="custom-form__step-form">
						<Button
							type="button"
							disabled={this.state.saving}
							onClick={this.createNew}
						>
							Create new Person
						</Button>

						<div className="conversation-team__navigation custom-form__navigation">
							<ReturnButton {...props} backLabel="Go Back" />
							<Button
								type="button"
								onClick={this.next}
								disabled={!host}
							>
								Next
							</Button>
						</div>
					</div>
				</div>
			);
		}
	}

	function ViewInteraction({ interaction }) {
		const date = dayjs(interaction.createdAt).format('DD/MM/YYYY');
		const { subject } = get(interaction, 'detail.private.subject');
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

		componentDidUpdate(prevProps, prevState, snapshot) {
			const { interaction: oldInteraction, host: oldHost } = this.prevProps;
			const { interaction, host } = this.props

			if ((oldInteraction !== interaction) || (oldHost !== host)) {
				load();
			}
		}

		load = async () => {
			const { host } = this.props;
			const messageCategories = 'meeting,message,email,phone';

			try {
				this.initSteps();

				const messages = await getData(api.interactions.getAll({
					query: {
						userUuid: host.uuid,
						categoryUuid: messageCategories,
						limit: 10,
					},
				}));
				this.setState({ messages });
			} catch (error) {
				console.error(error);
				this.setState({ error: error.message, loading: false });
			} finally {
				this.setState({ loading: false });
			}

			await this.checkCompleteSteps();
		}

		/**
		 * Copy messaging steps from campaign
		 * Note which steps are complete and overdue
		 */
		initSteps() {
			const grace = 48; // hours
			const now = dayjs();

			const { interaction } = this.props;
			const completedSteps = this
				.deserializeSteps(get(interaction, 'detail.private.followUpSteps', ''));

			// Clone steps and set calculated attributes
			const steps = get(this.props, 'global.campaign.private.hostMessages', [])
				.map((s) => {
					const step = { ...s };
					const field = step.sendAfter.field || 'createdAt';
					step.dueBy = dayjs(get(interaction, field))
						.add(step.value, step.period)
						// Give a grace for completing the step
						.add(grace, 'hours');
					step.complete = !!completedSteps[step.id];
					step.overdue = !step.complete && step.dueBy.isBefore(now);
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

		async checkCompleteSteps() {
			const { updateInteraction, interaction } = this.props;
			const { messages, steps, completedSteps } = this.state;

			if (!get(interaction, 'detail.private.followUpCompletedAt')) {
				try {
					let changed;

					messages.forEach((message) => {
						const type = get(message, 'detail.private.forInteraction');
						const stepId = get(message, 'detail.private.actionStepId');
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

					if (changed) await updateInteraction(interaction);
				} catch (error) {
					console.error(error);
					this.setState({ error: `Could not update: ${error.message}` });
				}
			}
		}

		nextStep() {
			const { steps } = this.state;
			const remaining = steps
				.filter(step => !step.complete)
				.sort((a, b) => (a.isBefore(b) ? 1 : -1));

			let nextStep = remaining[0];
			remaining.find((step) => {
				if (step.overdue) return true;
				nextStep = step;
				return false;
			});
			this.setState({ nextStep });
		}

		render() {
			const { messages, loading, error, nextStep } = this.state;
			const { host, interaction } = this.props;
			if (!(host || interaction)) return '';
			if (loading) return <Spinner />;

			const noun = ? 'You' : facilitator.preferredName;
			const nextStepMessage = ?
				`${noun} should send ${host.preferredName} a message around ` :
				`${noun} should have sent ${host.preferredName} a message around ${}`;


			return (
				<div className="host--interactions__wrapper">
					{error ? (
						<div className="error">
							<p>{error}</p>
						</div>
					) : ''}
					{nextStep ? (
						<div className="host--interactions__next-message">
							{noun} should {nextStep.overdue ? 'have sent' : 'send'} {host.preferredName} a message around
							{nextStep.dueBy.format('MMM D (dddd)')} about
							{nextStep.about}
							<Messenger
								{...this.props}
								to={[host]}
								subject={nextStep.subject}
								body={nextStep.body}
								sendBy={nextStep.sendBy}
								launchButtonLabel="Send Now"
							/>
							<Button>{"I've"} already done this</Button>
						</div>
					) : ''}
					<div className="host--interactions__list">
						{messages.length ? (
							<ol>
								{messages.map(message => <ViewInteraction interaction={message} />)}
							</ol>
						) : (
							<p>We {"haven't"} recorded any interactions with this host yet</p>
						)}
						View all interactions with the host in Raisely <RaiselyButton recordType="user" uuid={host.uuid} />
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
							global={global}
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
			const { save: saveFn, shouldSave } = this.props;
			if (shouldSave()) {
				this.setState({ saving: true });
				try {
					await saveFn();
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
			const bookingUrl = ReturnButton().forwardReturnTo({
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
		state = { mode: 'edit', form: editForm };

		componentDidMount() {
			this.setForm();
		}

		setForm = () => {
			const { mode, host, facilitator } = this.state;

			if (host) {
				editForm[0].description = (
					<React.Fragment>
						<div className="host--form__name">{host.fullName || host.preferredName}</div>;
						<div className="host--form__facilitator">Assigned to {facilitator.fullName || host.preferredName}</div>
					</React.Fragment>
				);
			}

			if (mode === 'new') {
				const newForm = [
					{ title: 'Find Person', component: FindHost },
					{ title: 'Add New Person', fields: userFields, condition: values => !get(values, '0.host') },
					{ title: 'Edit Host Status', fields: intentionFields, buttons: EditButtons },
				];

				this.setState({ form: newForm });
			} else {
				this.setState({ form: editForm });
			}
		}

		load = async ({ dataToForm }) => {
			// Load event and rsvps
			const { interaction } = await Promise.all([
				api.quickLoad({ props: this.props, models: ['interaction.private'], required: false }),
			]);

			// We must be creating a new host
			if (!interaction) {
				this.setState({ mode: 'new', interaction }, this.setForm);
				return {};
			}

			this.setState({ mode: 'edit' });

			const promises = [
				getData(api.users.get({ id: interaction.userUuid })),
			];
			const facilitatorUuid = get(interaction, 'detail.private.facilitatorUuid');
			if (facilitatorUuid) {
				promises.push(getData(api.users.get({ id: facilitatorUuid })));
			}

			Promise.all(promises)
				.then(([host, facilitator]) => this.setState({ host, facilitator }))
				.catch(console.error);

			return dataToForm({ interaction });
		}

		save = async (values, formToData) => {
			const data = formToData(values);

			if (data.user) {
				const host = await UserSaveHelper.upsertUser(data.user);
				this.setState({ host });
			}

			this.setState({ interaction: data.interaction });
			await save('interaction', data.interaction, { partial: true });
		}

		reassign = async (newFacilitator) => {
			const assignment = [{ recordType: 'user', recordUuid: host.uuid }];
			const { interaction } = this.state;
			_.set(interaction, 'detail.private.facilitatorUuid', newFacilitator.uuid);

			await Promise.all([
				save('interaction', interaction, { partial: true }),
				UserSaveHelper.proxy(`/users/${newFacilitator.uuid}/assignments`, {
					method: 'post',
					body: { data: assignment },
				}),
			]);
			this.setState({ facilitator: newFacilitator });
		}

		updateStep = (step, values) => {
			const host = get(values, '0.host');
			if (host) {
				this.setState({ host }, this.setForm);
			}
		}

		render() {
			const { form, host } = this.state;
			return (
				<div className="host-edit__wrapper">
					<CustomForm
						{...this.props}
						steps={form}
						controller={this}
						rsvps={this.state.rsvps}
						onRsvpChange
						redirectToReturnTo="true"
						host={host}
						reassign={this.reassign}
					/>
					<HostInteractions
						{...this.props}
						host={host}
						intention={interaction}
					/>
				</div>
			);
		}
	};
};
