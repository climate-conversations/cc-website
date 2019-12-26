/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const { api } = RaiselyComponents;
	const { getData } = api;
	const { get } = RaiselyComponents.Common;

	const CustomForm = RaiselyComponents.import('custom-form');
	const UserSaveLoader = RaiselyComponents.import('cc-user-save');
	let UserSaveHelper;

	const userOnlyFields = ['email', 'preferredName', 'fullName', 'phoneNumber'];

	return class CustomSignupForm extends React.Component {
		componentDidMount() {
			const UserSaveClass = UserSaveLoader();
			if (!UserSaveClass) return;
			UserSaveHelper = UserSaveClass.type;

			console.log('CustomSignupForm values:', this.getConfig());
		}

		getConfig() {
			const settings = this.props.getValues();
			// Allow override by props
			return Object.assign({}, settings, this.props);
		}

		save = async (values, formToData) => {
			const data = formToData(values);

			const detail = { ...data.user };

			const user = await UserSaveHelper.upsertUser(data.user);

			const settings = this.getConfig();
			if (settings.interactionCategory) {
				userOnlyFields.forEach(field => delete detail[field]);

				detail.private.formName = settings.formName || '<unnamed form>';
				detail.private.formUrl = window.location.href;

				const interaction = {
					detail,
					categoryUuid: settings.interactionCategory,
					userUuid: user.uuid,
					recordType: 'user',
					recordUuid: user.uuid,
				};
				const campaign = this.props.global.campaign.uuid;
				await UserSaveHelper.proxy(`/interactions?campaign=${campaign}`, {
					method: 'post',
					body: { data: interaction },
				});
			}
		}

		buildSteps() {
			// eslint-disable-next-line object-curly-newline
			const { fields, title, description, actionText } = this.getConfig();
			const step1 = {
				title,
				description,
				actionText,
			};

			step1.fields = fields ? fields.map((field) => {
				const result = {
					default: field.default,
					sourceFieldId: field.id,
					hidden: !!field.hidden,
				};
				if (field.hidden) result.type = 'hidden';
				return result;
			}) : [];

			step1.fields.push('user.privacyNotice');

			return [step1];
		}

		render() {
			const steps = this.buildSteps();
			if (!this.hasLoggedSteps) {
				console.log('Custom Signup Steps: ', steps);
				this.hasLoggedSteps = true;
			}
			const settings = this.getConfig();
			delete settings.fields;
			// eslint-disable-next-line object-curly-newline
			const props = { ...this.props, ...settings, steps, controller: this };
			const { backgroundColour } = settings;
			const className = `custom-form--signup block--${backgroundColour}`;

			return (
				<div className={className}>
					<CustomForm {...{ ...props }} />
				</div>
			);
		}
	};
};

