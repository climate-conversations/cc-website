/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => class FacilDonationReport extends React.Component {
	generateForm() {
		const cashReport = ['event.wereDonationsReceived', 'event.cashReceivedAmount', 'event.reportScan'];
		const transferReport = ['event.transferScreenshot', 'event.cashTransferredAt',
			'event.cashTransferAmount', 'event.cashTransferReference'];

		const multiFormConfig = [
			{ title: 'Donation Report', fields: cashReport },
			{ title: 'Transfer Cash', fields: transferReport, condition: (values) => values[0].wereDonationsReceived },
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
