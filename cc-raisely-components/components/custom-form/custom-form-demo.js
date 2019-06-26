/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	let CustomForm;

	class CustomSignupForm extends React.Component {
		buildSteps() {
			const step1fields = [
				'user.firstName',
				{ sourceFieldId: 'user.email', label: 'Electronic Mail', required: true },
			];
			const step2fields = [
				'user.postcode',
				{ recordType: 'profile', private: true, id: 'Team Color', label: 'Team Color', type: 'text' },
			];

			const steps = [
				{ title: 'Step 1 Questions', fields: step1fields },
				{ title: 'Step 2 Questions', fields: step2fields },
				{ component: MyCustomFormStep },
			]

			return steps;
		}

		load = async ({ dataToForm }) => {
			// load up some values
			const data = api.getUser();

			return dataToForm(data);
		}

		updateValues(values, formToData) {
			// Update the values instantly
		}
		updateStep(step, values, formToData) {
			// Update values when navigating to another step
		}
		save = async (values, formToData) {
			// formToData transforms data from
			// [ { firstName, email }, { private.postcode, private.teamColor } ]
			// to
			// {
			//   user: {
			// 		firstName,
			// 		email,
			// 		private: { hobby },
			// 	 },
			//   profile: { teamColor },
			// }
			const data = formToData(values);

			// Upsert user / register
			// Save interaction

			// Form will only advance to success step when promise resolves
			// (if promise rejects will remain on last step of the form)
		}

		finalPage({ completeHref }) {
			// Changing the key will cause react to re-fresh the component
			const reset = () => this.setState({ key: 'something new' });

			return (
				<div>
					<p>Thanks!</p>
					<div>
						<Button theme="primary" onClick={reset}>Add another profile</Button>
						<Button theme="secondary" href={completeHref}>Go to dashboard</Button>
					</div>
				</div>
			);
		}

		render() {
			const steps = this.buildSteps();

			return (
				<div className="custom-form--signup">
					<CustomForm
						{...this.props}

						steps={steps}
						controller={this}
						key={this.state.key}

						completeText="Thank you for doing the form"
						completeLabel="Next Thing"
						completeHref="/next-thing"
					/>
				</div>
			);
		}
	}

	return React.lazy(async () => {
		// use React.lazy to defer rendering until the component loads lodash
		CustomForm = await RaiselyComponents.import('custom-form');
		return { default: CustomSignupForm };
	});
};

