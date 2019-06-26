/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const preSurvey = [];
	const postSurvey = [];
	const guestInfo = ['user.fullName', 'user.email', 'user.phone', 'user.postcode',
		{
			"label": 'I am interested in ...',
			"id": "description1",
			"type": "rich-description",
		},
		'user.host', 'user.facilitate', 'user.corporate', 'user.research', 'user.volunteer'];
	const guestDonation = ['donation.amount', {
		id: 'donationType',
		type: 'select',
		label: 'Donation?',
		options: [
			{ value: 'no', label: 'Not at this time' },
			{ value: 'cash', label: 'Cash' },
			{ value: 'online', label: 'Online' },
			{ value: 'direct_debit', label: 'Direct Debit' },
		],
		active: true,
		core: true,
		required: true,
	}];

	const conversationDate = ['event.startDate'];

	const multiFormConfig = [
		{ title: 'Pre-Survey', fields: preSurvey },
		{ title: 'Post-Survey', fields: postSurvey },
		{ title: 'Personal Details', fields: guestInfo },
		{ title: 'Action', fields: guestAction },
		{
			title: 'Conversation Date',
			fields: conversationDate,
			condition: fields => fields[3].host,
		},
	];

	return class GuestDataEntry extends React.Component {

		async save({ fields, next }) {
			// Upsert user
			await Promise.all([
				// Create activity for survey
				// Save donation / donation intention
				// Send to cloud function to sync with sheet
				// Save new conversation
			]);

			// Advance form state
			next();
		}

		saving() {
			const descriptions = {
				user: 'guest details',
				survey: 'survey',
				donation: 'cash donation',
				intention: 'donation intention',
				conversation: 'new conversation',
				demographics: 'demographics',
			};

			let hasError = false;
			let details;

			if (this.state.saving) {
				details = this.state.saving.map(setting => {
					if (setting.message) hasError = true;
					const status = setting.message || 'OK';
					return <p>Saving {descriptions[setting.id]} ... {status}</p>
				});
			}

			return hasError ? details : (<p>Saving guest details</p>);
		}

		finished({ reset, finish }) {
			return (
				<div>
					<Button theme="primary" onClick={reset}>Add another Guest</Button>
					<Button theme="secondary" onClick={finish}>Finished</Button>
				</div>
			);
		}

		render() {
			const values = this.props.getValues();
			return <h1>This is a boilerplate Raisely custom component</h1>;
		}
	}
}
