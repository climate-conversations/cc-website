/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const { api } = RaiselyComponents;
	const { getData } = api;
	const { get } = RaiselyComponents.Common;

	const CustomForm = RaiselyComponents.import('custom-form');
	const UserSaveHelper = RaiselyComponents.import('cc-user-save', { asRaw: true });

	const userOnlyFields = ['email', 'preferredName', 'fullName', 'phoneNumber'];

	return class CustomSignupForm extends React.Component {
		save = async (values, formToData) => {
			const data = formToData(values);

			const details = { ...data.user };

			const user = await UserSaveHelper.upsertUser(data.user);

			const settings = this.props.getValues();
			if (settings.interactionCategory) {
				userOnlyFields.forEach(field => delete details[field]);

				details.formName = settings.formName || '<unnamed form>';
				details.formUrl = window.location.href;

				const interaction = {
					categoryUuid: settings.interactionCategory,
					userUuid: user.uuid,
					recordType: 'user',
					recordUuid: user.uuid,
					details: {
						private: details,
					},
				};
				await getData(api.interactions.create({ data: interaction }));
			}
		}

		buildSteps() {
			console.log(this.props.getValues());
			// eslint-disable-next-line object-curly-newline
			const { fields, title, description, actionText } = this.props.getValues();
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
			const settings = this.props.getValues();
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

