/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const CustomForm = RaiselyComponents.import('custom-form');

	const { api } = RaiselyComponents;
	const { getData, save } = api;
	const { get } = RaiselyComponents.Common;

	return class FacilDonationReport extends React.Component {
		generateForm() {
			const cashReport = ['event.cashReceived', 'event.cashReceivedAmount', {
				id: 'linking-info',
				type: 'rich-description',
				default: `
					<h5>Upload Report</h5>
					<p>Every conversation must have a cash donations report, even if you received $0 in donations.</p>
					<p>If you and the host agreed before hand not to collect donations, please upload a screenshot of the email or message in which that was agreed.</p>`,
			},
			'event.cashReportScan'];
			const transferReport = ['event.cashTransferScreenshot', 'event.cashTransferredAt',
				'event.cashTransferAmount', 'event.cashTransferReference'];

			const multiFormConfig = [
				{ title: 'Donation Report', fields: cashReport },
				{ title: 'Transfer Cash', fields: transferReport, condition: values => get(values, '0.private.cashReceived') },
			];

			return multiFormConfig;
		}

		load = async ({ dataToForm }) => {
			const records = await api.quickLoad({ props: this.props, required: true, models: ['event.private'] });
			return dataToForm(records);
		}

		async save(values, formToData) {
			console.log('Saving');
			const data = formToData(values);
			const { event } = data;
			return getData(save('event', event, { partial: true }));
		}

		render() {
			const config = this.generateForm();
			const description = 'As part of our governance requirements, we must keep good records of all donations received at conversations to demonstrate to our donors, grantors and auditors that we are trustworthy. Please complete this form in full.';
			return (
				<CustomForm
					{...this.props}
					steps={config}
					controller={this}
					description={description}
					redirectToReturnTo="true"
				/>
			);
		}
	};
};
