(RaiselyComponents) => class FacilReflection extends React.Component {
	generateForm() {
		const questions = [];

		const multiFormConfig = [
			{ title: 'Facilitator Reflection', fields: questions },
		];
	
		return multiFormConfig;
	}

	async save({ fields }) {
		// Add to host rsvp
		// Send custom email to houston
		// Advance form
	}

	render() {
		const config = this.generateForm();
		return (<Form
			config={config}
			controller={this}
			saveMessage="Saving reflection"			
			/>
		);
	}
}