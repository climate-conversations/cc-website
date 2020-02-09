/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const CustomForm = RaiselyComponents.import('custom-form');

	const { api } = RaiselyComponents;
	const { getData, save } = api;
	const { get } = RaiselyComponents.Common;

	const showTransferPage = values =>
		get(values, '0.private.cashReceived') ||
		get(values, '0.private.cashReceivedAmount');

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
				{ title: 'Transfer Cash', fields: transferReport, condition: showTransferPage },
				{ title: 'Notes on Donations', fields: [
					{
						id: 'notes-description',
						type: 'rich-description',
						default: 'If you have anything you need to note about the cash donations, place those notes here',
					},
					'event.cashDonationsFacilitatorNotes'
				]},
			];

			return multiFormConfig;
		}

		load = async ({ dataToForm }) => {
			const records = await api.quickLoad({ props: this.props, required: true, models: ['event.private'] });
			this.setState(records);
			return dataToForm(records);
		}

		async save(values, formToData) {
			console.log('Saving');
			const data = formToData(values);
			const { event } = data;
			return getData(save('event', event, { partial: true }));
		}

		renderLeaderNotes() {
			const leaderNotes = get(this.state, 'event.private.cashDonationsLeaderNotes')
			if (!leaderNotes) return '';
			return (
				<div className="facil-donations-report--leader-notes--wrapper">
					<div className="">Your facilitator left a note regarding your donations report</div>
					<div className="team-leader-notes">{leaderNotes}</div>
				</div>
			);
		}

		render() {
			const config = this.generateForm();
			const description = 'As part of our governance requirements, we must keep good records of all donations received at conversations to demonstrate to our donors, grantors and auditors that we are trustworthy. Please complete this form in full.';
			return (
				<div className="facil-donations-report--wrapper">
					{this.renderLeaderNotes()}
					<CustomForm
						{...this.props}
						steps={config}
						controller={this}
						description={description}
						redirectToReturnTo="true"
					/>
				</div>
			);
		}
	};
};
