(RaiselyComponents, React) => {
	// eslint-disable-next-line object-curly-newline
	const { displayCurrency, get, kebabCase, momentjs } = RaiselyComponents.Common;
	const { getData, save } = RaiselyComponents.api;
	const { Button } = RaiselyComponents.Atoms;
	const { Spinner } = RaiselyComponents;

	const ConversationRef = RaiselyComponents.import('conversation', { asRaw: true });
	let Conversation;
	const CustomForm = RaiselyComponents.import('custom-form');
	const ReturnButton = RaiselyComponents.import('return-button');
	const WhatsappButton = RaiselyComponents.import('whatsapp-button');

	const amountFields = ['cashCtaAmount', 'cashReceivedAmount', 'cashTransferAmount'];

	const steps = [
		{ id: 'donationReport', valueField: 'cashReceivedAmount', imageField: 'cashReportScan' },
		{
			id: 'transfer',
			valueField: 'cashTransferAmount',
			imageField: 'cashTransferScreenshot',
			show: state => !!get(state, 'conversation.private.cashReceivedAmount'),
		},
		{ id: 'notes' },
	];

	const fields = ['event.cashDonationsLeaderNotes', 'event.cashDonationsReviewed'];
	const formSteps = [{ fields }];

	return class ReconcileConversation extends React.Component {
		state = { step: 0, loading: true };

		componentDidMount() {
			this.initState();
		}

		async initState() {
			if (!Conversation) Conversation = ConversationRef().html;
			const { props } = this;
			try {
				await Promise.all([
					Conversation.loadConversation({ props, private: 1 })
						.then(values => this.setState(values)),
					Conversation.loadRsvps({ props, type: ['facilitator', 'guest'] })
						.then(values => this.setState(values)),
				]);
				this.setState({ loading: false });
			} catch (e) {
				console.error(e);
				this.setState({ loading: false, error: e.message });
			}
		}

		next = () => {
			let { step } = this.state;
			let canShow;
			do {
				step += 1;
				canShow = !steps[step].show || steps[step](this.state);
			} while ((!canShow) && (step < (steps.length - 1)));
			this.setState({ step });
		}

		imageChecked = (match) => {
			const failed = this.state.failed || [];
			const stepId = steps[this.state.step].id;
			if (!match) this.state.failed.push(stepId);
			this.setState({ failed }, this.next);
		}

		pictureConfirmationStep() {
			const step = steps[this.state.step];
			const { id, valueField, imageField } = step;
			const className = kebabCase(id);

			const url = get(this.state, `conversation.private.${imageField}`);
			const value = displayCurrency(get(this.state, `conversation.private.${valueField}`), 'SGD');

			return (
				<div className={`reconcile--${className}`}>
					<img href={url} alt="" />
					<p>Is the amount shown in the image {value}?</p>
					<Button onClick={() => this.imageChecked(false)}>No</Button>
					<Button onClick={() => this.imageChecked(true)}>Yes</Button>
				</div>
			);
		}

		/**
		 * Generate a message for the FTL to send on WhatsApp or email to the facilitator
		 * to ask them to check and correct their donations report
		 * The message will include a url to the donations report and notes on what specifically
		 * is wrong
		 * @returns {string}
		 */
		facilitatorMessage({ amounts, inconsistent }) {
			const { failed, conversation } = this.state;
			const date = momentjs(conversation.startAt).format('MMM dd');
			const url = `https://p.climate.sg/conversations/${conversation.uuid}/donations-report`;
			const ftlName = get(this.props, 'global.user.preferredName');

			const open = `Hi,
			Can you help me to check the donations for the conversation on ${date} (${conversation.name})?`;

			const messages = {
				donationReport: `The amount on the donations report is not the same as the amount you wrote (${amounts.cashReceivedAmount})`,
				transfer: `The amount on the transaction screenshot is not the same as the amount you wrote (${amounts.cashTransferAmount})`,
			};
			const imageErrors = ['donationReport', 'transfer']
				.map(key => (failed.includes(key) ? messages[key] : ''))
				.filter(m => m)
				.join(', and');

			const allErrors = [
				imageErrors,
				inconsistent ?
					`The cash amounts aren't all the same:
					${amounts.cashReceivedAmount} on the donations report,
					${amounts.cashTransferAmount} on the bank transfer,
					${amounts.cashCtaAmount} according to CTA forms` : '',
			]
				.filter(m => m)
				.join('. Also, ');

			const close = `Can you please check the donations and make a note on the reasons for this?
${url}
Thanks ☺️, ${ftlName}`;

			return `${open}
${allErrors}
${close}`;
		}

		load = async ({ dataToForm }) => {
			const { conversation } = this.state;
			return dataToForm({ event: conversation });
		}

		save = async (values, formToData) => {
			console.log('Saving');
			const data = formToData(values);
			const { event } = data;
			return getData(save('event', event, { partial: true }));
		}

		reconcileStep({ amounts, inconsistent }) {
			const facilMessage = this.facilitatorMessage({ amounts, inconsistent });
			const facilNotes = get(this, 'state.conversation.private.cashDonationsFacilitatorNotes');
			const { facilitators } = this.state;
			const phone = facilitators[0].phoneNumber;

			return (
				<div className="reconcile--notes">
					{inconsistent ? (
						<React.Fragment>
							<p>The amounts are inconsistent, can you please check them with the faciltiator?</p>
							<div className="reconcile--amounts">
								<ul>
									<li>Amount in CTA forms: {amounts.cashCtaAmount}</li>
									<li>Amount written in donation report: {amounts.cashReceivedAmount}</li>
									<li>Amount transferred by facilitator: {amounts.cashTransferAmount}</li>
								</ul>
							</div>
						</React.Fragment>
					) : ''}
					<div className="reconcile--notes_facil-notes">
						<p>
							The facilitator has added the following notes about the donations received.
							If these notes satisfactorily account for the donation amounts,
							please tick the box below.
						</p>
						<div className="reconcile--facil-notes">{facilNotes}</div>
					</div>
					<p>
						If you require more information from the facilitator,
						click this button to follow up with them
					</p>
					<WhatsappButton
						message={facilMessage}
						phone={phone}
						label="Whatsapp Facilitator"
					/>
					<CustomForm
						{...this.props}
						steps={formSteps}
						controller={this}
						redirectToReturnTo="true"
					/>
				</div>
			);
		}

		render() {
			const { error, step, loading } = this.state;
			const { props } = this;

			if (loading) return <Spinner />;

			if (error) {
				return (
					<div className="reconcile--notes">
						<p className="error">{error}</p>
					</div>
				);
			}

			const amounts = {};
			amountFields.forEach((key) => {
				amounts[key] = displayCurrency(get(this.state, `conversation.private.${key}`, 0), 'SGD');
			});
			const inconsistent = amountFields.reduce((last, key) => {
				const current = amounts[key];
				if (last === true || last === current) return current;
				return false;
			}, true);

			return (
				<div className="conversation--reconcile__wrapper">
					<div className="description">
						Thank you for taking the time to review the donations and ensure
						we are keeping good records.
						{"Here's"} what you need to do:
						<ol>
							<li>Confirm that the amounts in the pictures match the amounts entered</li>
							{inconsistent ? (
								<li>Check if {"there's"} a valid reason why the donation amounts {"don't"} match</li>
							) : ''}
						</ol>
					</div>
					{step < 2 ?
						this.pictureConfirmationStep() :
						this.reconcileStep({ amounts, inconsistent })}
					<ReturnButton {...props} backLabel="Go back" />
				</div>
			);
		}
	};
};
