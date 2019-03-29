/**
  * Custom Profile Editor
  * For displaying a limit set of fields to edit
  *
  * Define the following fields for the custom component
  *
  * @field {text} fields Comma separated list of field ids to show
  * @field {text} redirect Path to redirect to on successful form submission
  * @field {text} buttonLabel Label for the submit button
  */

// eslint-disable-next-line no-unused-expressions
(RaiselyComponents, React) => {
	const { Form, api } = RaiselyComponents;
	const { Button } = RaiselyComponents.Atoms;

	const defaults = {
		buttonLabel: 'Save',
	};

	/**
	 * Custom Profile Edit Form molecule
	 */
	return class CustomProfileEditForm extends React.Component {
		static description = 'The edit form for a profile';

		state = {
			values: this.props.getFormValues({
				fields: 'profile', from: this.props.profile || 'current',
			}),
		}

		componentDidMount() {
			this.loadProfile();
		}

		async loadProfile() {
			const { profile } = this.props.global.user;
			if (!profile) return;
			console.log('loading profile...');

			const result = await api.profiles.get({
				id: profile.uuid,
				query: { private: 1 },
			});

			const fullProfile = result.body().data().data;
			const formValues = this.props.getFormValues({
				fields: fullProfile,
			});
			console.log(`Profile loaded: `, fullProfile);
			this.setState({ values: formValues, profile: fullProfile }, this.checkAlreadyConfirmed);
		}

		checkAlreadyConfirmed = () => {
			if (this.alreadyConfirmed()) {
				this.doRedirect();
			}

			const { profile } = this.state;

			profile.private.firstConfirmAttempt = new Date().toISOString();

			if (profile) {
				// On mount, save that the user loaded the confirmation page
				if (!profile.private.firstConfirmAttempt) {
					this.props.api.profiles.update({
						id: profile.uuid,
						data: {
							private: profile.private,
						},
					});
				}
			}
		}

		alreadyConfirmed() {
			const { profile } = this.state;

			return profile && profile.public && profile.public.confirmedAt;
		}

		doRedirect() {
			const { redirect } = this.props.getValues();
			if (redirect) this.props.history.push(redirect);
		}

		action = async (formData, options) => {
			const { integrations } = this.props;
			// update user details
			try {
				const data = this.props.processFormData(formData);

				const { profile } = this.state;
				if (!profile) throw new Error('Failed to load your profile');

				data.private = profile.private;
				data.public = profile.public;

				data.private.confirmedAt = new Date().toISOString();
				data.public.switchOnConfirmed = 'yes';
				data.public.switchOnStatus = 'confirmed';

				const request = await this.props.api.profiles.update({
					id: this.props.global.user.profile.uuid,
					data: { data },
				});
				this.props.actions.addUserProfile(request.body().data().data);
				this.props.actions.addMessage('Profile updated succesfully');
				integrations.broadcast('profile.updated', { user: this.props.global.user, profile: request.body().data().data });
				options.setSubmitting(false);

				const activityLog = {
					date: new Date().toISOString(),
					userUuid: this.props.global.user.uuid,
					profileUuid: this.props.global.user.profile.uuid,
					distance: profile.private.monthlyKWH,
					activity: 'OTHER',
				};

				await this.props.api.exercise.create({
					data: { data: activityLog },
				});

				this.doRedirect();
			} catch (e) {
				options.setSubmitting(false);
				this.props.actions.addErrorMessage(e);
			}
		}

		render() {
			const values = this.props.getValues();

			Object.keys(values)
				.forEach((key) => { if (values[key] === null) values[key] = defaults[key]; });

			const { global } = this.props;

			this.redirect = values.redirect;

			// Split fields by comma, remove any fields that are empty string
			const fieldsToShow = (values.fields || '').split(',').map(f => f.trim()).filter(f => f);

			// Show only selected fields
			const fields = global.customFields.profile
				.filter(f => fieldsToShow.includes(f.id));

			fields.forEach((f) => {
				// eslint-disable-next-line no-param-reassign
				if (f.rules) delete f.rules;
			});

			if (this.alreadyConfirmed()) {
				return (
					<div>
						<p>You have already confirmed your signup. Thank you!</p>
					</div>
				);
			}

			if (!this.props.global.user) {
				return (
					<div className="confirm-form">
						<div className="confirm-form__body">

							<h4>Have we met before?</h4>
							<p>
								{"We're"} not sure if {"you've"} already signed up.
								If you did, try clicking on a link in an email we sent you.
								If not, you can sign up now and get started right away!
							</p>
							<div className="buttons">
								<Button
									href="/reset">
									Send me a new link!
								</Button>
								<Button
									theme="cta"
									href="/signup">
									I want to sign up
								</Button>
							</div>
						</div>
					</div>
				);
			}

			return (
				<div className="confirm-form">
					<Form
						fields={fields}
						values={values}
						global={global}
						actionText={values.buttonLabel}
						action={this.action}
						className="confirm-form__body"
					/>
				</div>
			);
		}
	};
};
