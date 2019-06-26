(RaiselyComponents, React) => {
	let CustomForm;

	class CustomSignupForm extends React.Component {
		async save() {
			// Upsert user / register
			// Save interaction

		}

		buildSteps() {
			const values = this.props.values();
		}

		render() {
			const steps = this.buildSteps();
			const settings = this.props.values();
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
}

