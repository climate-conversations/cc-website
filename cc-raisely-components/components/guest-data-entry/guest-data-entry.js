/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const preSurvey = [{ interactionCategory: 'cc-pre-survey', exclude: ['conversationUuid'] }];
	const postSurvey = [{
		interactionCategory: 'cc-post-survey',
		exclude: ['conversationUuid', 'research', 'fundraise', 'host', 'volunteer', 'corporate'],
	}];
	// Fixme warn the facil that without an email, follow up will be limited, and ask the
	// host if they can get it
	const guestAction = ['user.fullName', 'user.email', 'user.phone', 'user.postcode',
		{
			interactionCategory: 'cc-post-survey',
			include: ['host', 'facilitate', 'volunteer', 'corporate', 'research', 'fundraise'],
		},
	];
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
		{ title: 'Guest Action', fields: guestAction },
		{ title: 'Action', fields: guestDonation },
		{
			title: 'Conversation Date',
			fields: conversationDate,
			condition: fields => fields[3].private.host,
		},
	];

	return class GuestDataEntry extends React.Component {

		async save({ fields, next }) {
			// Upsert user
			// Copy interaction host, vol, facil over to user
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
				details = this.state.saving.map((setting) => {
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
	};
};
