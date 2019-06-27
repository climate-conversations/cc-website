/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const CustomForm = RaiselyComponents.import('custom-form');

	return class CustomSignupForm extends React.Component {
		save = async () => {
			const p = new Promise((resolve) => {
				setTimeout(resolve, 1000);
			});

			// Wait for 1s so we can see how the form works
			await p;

			if (!this.tried) {
				this.tried = true;
				throw Error('This is what it looks like when cannot save. Try again.');
			}
			// Upsert user / register
			// Save interaction
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

			step1.fields = fields ? fields.map(field => ({
				default: field.default,
				sourceFieldId: field.id,
				hidden: !!field.hidden,
			})) : [];

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

