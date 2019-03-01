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
	const { Form } = RaiselyComponents;
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
			// If they've already confirmed, do the redirect
			if (this.alreadyConfirmed()) {
				this.doRedirect();
			}

			const { profile } = this.props.global.current;

			if (profile) {
				// On mount, save that the user loaded the confirmation page
				if (!profile.private.firstConfirmAttempt) {
					this.props.api.profiles.update({
						id: profile.uuid,
						data: {
							private: {
								firstConfirmAttempt: new Date().toISOString(),
							},
						},
					});
				}
			}
		}

		alreadyConfirmed() {
			const { profile } = this.props.global.user;

			return profile && profile.public && ['confirmed', ''].includes(profile.public.switchOnStatus);
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

				data.private.confirmedAt = new Date().toISOString();
				data.public.switchOnStatus = 'confirmed';

				const request = await this.props.api.profiles.update({
					id: this.props.global.user.profile.uuid,
					data,
				});
				this.props.actions.addUserProfile(request.body().data().data);
				this.props.actions.addMessage('Profile updated succesfully');
				integrations.broadcast('profile.updated', { user: this.props.global.user, profile: request.body().data().data });
				options.setSubmitting(false);

				const activityLog = {
					date: new Date().toISOString(),
					userUuid: this.props.global.user.uuid,
					profileUuid: this.props.global.user.profile.uuid,
					distance: this.props.global.user.profile.public.monthlyKWh,
					activity: 'OTHER',
				};

				await this.props.api.exercise.create({
					data: activityLog,
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

			if (this.alreadyConfirmed()) {
				return (
					<div>
						<p>You have already confirmed your signup. Thank you!</p>
					</div>
				);
			}

			if (!this.props.global.user) {
				return (
					<div>
						<h5>Oops!</h5>
						<p>
							This is embarrassing, but we {"can't"} remember who you are
							in order to confirm your switch.
						</p>
						<p>Try clicking a link from an email {"we've"} sent you.</p>
						<Button
							href="/reset">
							Send me a new link!
						</Button>
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
					/>
				</div>
			);
		}
	};
};
