(RaiselyComponents, React) => {
	const { api } = RaiselyComponents;
	const { Button } = RaiselyComponents.Atoms;
	const UserSelect = RaiselyComponents.import('user-select');
	const RaiselyButton = RaiselyComponents.import('raisely-button');

	return function UserSelectWrapper({ global, label, updateUser, user }) {
		if (user && user.uuid) {
			const name = user.fullName || user.preferredName;

			return (
				<div className="conversation-team__selected_user field-wrapper">
					<label htmlFor={label}>
						<span className="form-field__label-text">{label}</span>
					</label>
					<div className="user__card">
						<div className="static-field__title">{name}</div>
						<div className="static-field__subtitle">{user.email}</div>
						<Button type="button" onClick={() => updateUser({})}>Change</Button>
						<RaiselyButton uuid={user.uuid} recordType="people" />
					</div>
				</div>
			);
		}

		return (
			<div className="conversation-team__user-select field-wrapper">
				<UserSelect
					api={api}
					global={global}
					update={updateUser}
					label={label}
				/>
			</div>
		);
	}
};
