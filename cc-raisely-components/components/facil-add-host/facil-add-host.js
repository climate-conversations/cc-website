/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const CustomForm = RaiselyComponents.import('custom-form');
	const UserSelect = RaiselyComponents.import('user-select');
	const RaiselyButton = RaiselyComponents.import('raisely-button');
	const ReturnButton = RaiselyComponents.import('return-button', { asRaw: true });

	const UserSaveHelper = RaiselyComponents.import('cc-user-save', { asRaw: true });

	const { api } = RaiselyComponents;
	const { Button } = RaiselyComponents.Atoms;
	const { get } = RaiselyComponents.Common;
	const { getData, save } = api;

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
								If the host is an organisation, enter the contact person
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
				this.setState({ mode: 'new' }, this.setForm);
				return {};
			}

			this.setState({ mode: 'edit' });

			Promise.all([
				getData(api.users.get({ id: interaction.userUuid })),
				getData(api.users.get({ id: interaction.detail.private.facilitatorUuid })),
			])
				.then(([host, facilitator]) => this.setState({ host, facilitator }))
				.catch(console.error);

			return dataToForm({ interaction });
		}

		save = async (values, formToData) => {
			const data = formToData(values);

			if (data.user) {
				const user = await UserSaveHelper.upsertUser(data.user);
			}

			await save('interaction', data.interaction, { partial: true });
		}

		updateStep = (step, values) => {
			const host = get(values, '0.host');
			if (host) {
				this.setState({ host }, this.setForm);
			}
		}

		render() {
			const { form, host } = this.state;
			return (<CustomForm
				{...this.props}
				steps={form}
				controller={this}
				rsvps={this.state.rsvps}
				onRsvpChange
				redirectToReturnTo="true"
				host={host}
			/>);
		}
	};
};
