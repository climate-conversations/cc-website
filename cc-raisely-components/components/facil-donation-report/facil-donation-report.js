(RaiselyComponents) => class FacilDonationReport extends React.Component {
	generateForm() {
		const cashReport = ['event.wereDonationsReceived', 'event.cashReceivedAmount', 'event.reportScan'];
		const transferReport = ['event.transferScreenshot', 'event.cashTransferredAt',
			'event.cashTransferAmount', 'event.cashTransferReference'];

		const multiFormConfig = [
			{ title: 'Donation Report', fields: questions },
			{ title: 'Transfer Cash', fields: questions, condition: (fields) => fields[0].wereDonationsReceived },
		];
	
		return multiFormConfig;
	}

	async load() {
		// Load event data
	}

	async save({ fields, step }) {
		// Save report to event
		// Send to cloud function to sync to cash donations spreadsheet
		// if last step, advance form
	}

	render() {
		const config = this.generateForm();
		return (<Form
			config={config}
			controller={this}
			saveEachStep="true"
			saveMessage="Saving Donation Report"			
			/>
		);
	}
}