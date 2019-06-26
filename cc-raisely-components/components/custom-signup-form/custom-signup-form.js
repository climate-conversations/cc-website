/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	let CustomForm;

	class CustomSignupForm extends React.Component {
		async save() {
			// Upsert user / register
			// Save interaction
		}

		buildSteps() {
			console.log(this.props.getValues());
			const { fields, title, description } = this.props.getValues();
			const step1 = {
				title,
			};

			step1.fields = fields ? fields.map(field => ({
				default: field.default,
				sourceFieldId: field.id,
				hidden: !!field.hidden,
			})) : [];

			if (description) {
				step1.fields.unshift({
					id: 'description1',
					type: 'rich-description',
					default: description,
				});
			}

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
			const props = { ...this.props, ...settings, steps };

			return (
				<CustomForm {...{ ...props }} />
			);
		}
	}

	return React.lazy(async () => {
		// use React.lazy to defer rendering until the component loads lodash
		CustomForm = await RaiselyComponents.import('custom-form');
		return { default: CustomSignupForm };
	});
};

