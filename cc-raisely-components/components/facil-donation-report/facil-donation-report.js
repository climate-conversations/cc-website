/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const CustomForm = RaiselyComponents.import('custom-form');

	const { api } = RaiselyComponents;

	return class FacilDonationReport extends React.Component {
		generateForm() {
			const cashReport = ['event.wereDonationsReceived', 'event.cashReceivedAmount', 'event.reportScan'];
			const transferReport = ['event.transferScreenshot', 'event.cashTransferredAt',
				'event.cashTransferAmount', 'event.cashTransferReference'];

			const multiFormConfig = [
				{ title: 'Donation Report', fields: cashReport },
				{ title: 'Transfer Cash', fields: transferReport, condition: values => values[0].private.wereDonationsReceived },
			];

			return multiFormConfig;
		}

		async load() {
			const record = await api.quickLoad({ props: this.props, required: true, models: ['event'] });
			this.record = record;
		}

		async save(values, formToData) {
			const data = formToData(values);
			return api.event.update({ id: this.record.uuid, data });
		}

		render() {
			const config = this.generateForm();
			return (
				<CustomForm
					{...this.props}
					steps={config}
					controller={this}
				/>
			);
		}
	};
};
