(RaiselyComponents, React) => {
	const { api, Form } = RaiselyComponents;
	const { get } = RaiselyComponents.Common;

	const oldPasswordField = {
		active: true,
		core: true,
		id: 'passwordOld',
		label: 'Old Password',
		locked: false,
		private: false,
		required: true,
		type: 'password',
	};
	const newPasswordField = {
		active: true,
		core: true,
		id: 'passwordNew',
		label: 'New Password',
		locked: false,
		private: false,
		required: true,
		type: 'password',
	};

	return class ResetAdminPassword extends React.Component {
		requestPasswordReset = async (values, options = {}) => {
			const { actions, global } = this.props;
			try {
				await api.users.password.update({
					id: global.user.uuid,
					data: {
						updated: values.passwordNew,
						current: values.passwordOld,
					},
				});
				if (!global.user.isAdmin) {
					await makeAdmin(global.user);
				}
				actions.addMessage('Password changed successfully');
				options.resetForm();
			} catch (e) {
				actions.addMessage('Password update failed');
				options.setSubmitting(false);
				// TODO: add message log here
				actions.addErrorMessage(e);
			}
		};

		/**
		 * Raisely won't permit a password without an existing password
		 * for an admin
		 * But as this user has never had a password before, we'll set
		 * them up as a non-admin, get them to set their password
		 * and then send set the admin flag once they've reset their password
		 */
		makeAdmin(user) {

		}

		render() {
			const isAdmin = get(this.props, 'global.user.isAdmin');
			const fields = [];
			if (isAdmin) fields.push(oldPasswordField);
			fields.push(newPasswordField);

			return (
				<div className={`raisely-reset-form raisely-reset-form--request`}>
					<Form
						key={isAdmin}
						fields={fields}
						values={{}}
						actionText={'Reset password'}
						action={this.requestPasswordReset}
					/>
				</div>
			);
		}
	}
}
