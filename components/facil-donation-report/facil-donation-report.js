/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const CustomForm = RaiselyComponents.import('custom-form');

	const { api } = RaiselyComponents;
	const { getData, save } = api;
	const { get } = RaiselyComponents.Common;

	const ConversationRef = RaiselyComponents.import('conversation', { asRaw: true });
	const UserSaveHelperRef = RaiselyComponents.import('cc-user-save', { asRaw: true });
	let Conversation;
	let UserSaveHelper;

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
			if (!Conversation) Conversation = ConversationRef().html;
			const event = await Conversation.loadConversation({ props: this.props, required: true, private: 1 });
			this.setState({ event });
			return dataToForm({ event });
		}

		save = async (values, formToData) => {
			console.log('Saving');
			const { event: existingEvent } = this.state;
			const data = formToData(values);
			const { event } = data;
			const conversation = { ...event };
			const transferPath = 'private.cashTransferScreenshot';
			const reportPath = 'private.cashReportScan';
			const newTransfer = get(conversation, transferPath);
			const newReport = get(conversation, reportPath);
			const webhookData = { conversation: event };
			const promises = [];

			delete conversation.uuid;
			if (!UserSaveHelper) UserSaveHelper = UserSaveHelperRef().html;
			promises.push(UserSaveHelper.proxy(`/events/${event.uuid}`, {
				method: 'PATCH',
				body: {
					partial: true,
					data: conversation,
				}
			}));

			if (newTransfer && get(existingEvent, transferPath) !== newTransfer) {
				promises.push(UserSaveHelper.notifySync(
					'conversation.donationReportUploaded', {
						...webhookData,
						url: newTransfer,
						type: 'transfer'
					}
				));
			}
			if (newReport && get(existingEvent, reportPath) !== newReport) {
				promises.push(
					UserSaveHelper.notifySync(
						'conversation.donationReportUploaded',
						{
							...webhookData,
							url: newReport,
							type: "report"
						}
					)
				);
			}
			return Promise.all(promises);
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
