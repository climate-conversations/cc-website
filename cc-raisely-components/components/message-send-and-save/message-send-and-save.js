(RaiselyComponents, React) => {
	const { api, Spinner } = RaiselyComponents;
	const { Button } = RaiselyComponents.Atoms;
	const { getData } = api;
	const { set } = RaiselyComponents.Common;
	const { Modal } = RaiselyComponents.Molecules;

	const CustomForm = RaiselyComponents.import('custom-form');
	const WhatsAppButtonRef = RaiselyComponents.import('whatsapp-button', { asRaw: true });
	const ReturnButton = RaiselyComponents.import('return-button');

	let WhatsAppButton;

	const initialContactFields = [{
		label: 'Subject',
		id: 'subject',
		type: 'text',
		recordType: 'message',
	}, {
		label: 'Message',
		id: 'body',
		type: 'html',
		recordType: 'message',
	}, {
		label: 'Send by',
		id: 'sendBy',
		type: 'select',
		recordType: 'message',
		options: [
			{ label: 'WhatsApp', value: 'whatsapp' },
			{ label: 'Email', value: 'email' },
		],
	}, {
		label: 'Send email from your',
		id: 'emailClient',
		type: 'select',
		default: 'gmail',
		options: [
			{ label: 'Gmail', value: 'gmail' },
			{ label: 'Yahoo', value: 'yahoo' },
			// { label: 'Hotmail', value: 'hotmail' },
			{ label: 'Other', value: 'other' },
		],
	}].map(field => Object.assign(field, { active: true, core: true }));

	const userHasPhone = user => !!user.phoneNumber;
	const userHasEmail = user => (user.email && !user.email.endsWith('@noemail.invalid'));
	const getLabel = user => user.fullName || user.preferredName || user.email || user.phoneNumber;

	class ContactForm extends React.Component {
		componentDidMount() {
			this.initRecipients();
			this.initContactFields();

			set(window, '$cc.contactFormSendWhatsapp', (id) => { this.send(id); });

			// setTimeout(() => {
			// 	const [parentElement] = document.getElementsByClassName('contact--form__recipients');

			// 	parentElement.click((e) => {
			// 		console.log('Clicked', e);
			// 		this.send(e.target.id);
			// 	});
			// }, 1);
		}

		onContactChange = (values) => {
			console.log('Contact Change: ', values);
			const contactSettings = values[0];
			const { contactFields } = this.state;
			// Disable/enable email client if email is selected
			const emailClient = contactFields.find(f => f.id === 'emailClient');
			emailClient.type = contactSettings.sendBy === 'email' ? 'select' : 'hidden';

			this.setState({ contactSettings }, this.setActiveRecipients);
		}
		onRecipientChange = (values) => {
			console.log('Recipients Change: ', values);
			const selectedRecipients = values[0];
			this.setState({ selectedRecipients });
		}

		/**
		 * Activate/deactive recipients if they have a phoneNumber/email
		 * depending on selected contact method
		 */
		setActiveRecipients = () => {
			const { recipientFields, contactSettings, allSent } = this.state;
			const { sendBy } = contactSettings;
			const { to } = this.props;
			console.log('Set active recipients', contactSettings)
			recipientFields.forEach((field) => {
				const user = to.find(u => u.uuid === field.id);
				const hasPhone = userHasPhone(user);
				const hasEmail = userHasEmail(user);

				/* eslint-disable no-param-reassign */
				if (sendBy === 'whatsapp' || (hasPhone && !hasEmail)) {
					const sent = (allSent || []).find(s => s.userUuid === user.uuid);
					field.type = 'rich-description';
					// window.$cc.contactFormSendWhatsapp(${user.uuid})
					const label = getLabel(user);
					field.default = `<div>
						<a onclick="console.log('clicked!)">
							${label || '(uncontactable guest)'} (${user.phoneNumber})
						</a>
						${sent ? '(sent)' : ''}
					</div>`;
				} else {
					field.type = 'checkbox';
					field.disabled = !(sendBy === 'whatsapp' ? userHasPhone(user) : userHasEmail(user));
				}
				/* eslint-enable no-param-reassign */
			});
			this.setState({ recipientFields, recipientFieldsKey: new Date().toISOString() });
		}

		initContactFields() {
			// Don't mess up the initial fields
			const contactFields = initialContactFields.map(f => ({ ...f }));
			const { sendBy, body, subject } = Object.assign({ sendBy: 'whatsapp' }, this.props);

			const contactSettings = {
				sendBy,
				body,
				subject,
			};

			this.setState({
				contactFields,
				contactSettings,
				contactSettingsKey: new Date().toISOString(),
			}, this.setActiveRecipients);
		}

		initRecipients() {
			const { to } = this.props;
			if (!Array.isArray(to)) {
				throw new Error('No recipients specified!');
			}
			const selectedRecipients = {};
			const recipientFields = to.map((user) => {
				selectedRecipients[user.uuid] = true;
				let { email } = user;
				// If the user doesn't really have an email
				if (email.endsWith('noemail.invalid')) { email = ''; }
				const label = getLabel(user)
				return {
					label: label || '(uncontactable guest)',
					id: user.uuid,
					type: 'checkbox',
					active: true,
					core: true,
					default: 'true',
					disabled: !label,
				};
			});

			this.setState({ selectedRecipients, recipientFields });
		}

		buttons = (recipientCount) => {
			const { to } = this.props;
			const { props } = this;
			const { launchButtonLabel, closeModal } = props;
			const { contactSettings, recentlySent, saving } = this.state;

			const isWhatsApp = contactSettings.sendBy === 'whatsapp';
			const recipientNames = recentlySent && recentlySent.length ?
				recentlySent.map(r => r.name).join(', ') :
				false;

			const user = to[0];

			return (
				<div className="contact--form__buttons">
					{isWhatsApp && (recipientCount > 1) ?
						<p>Click on the {"people's"} names above to send a WhatsApp message</p> :
						<Button onClick={this.sendAll} target="_blank">Send Email</Button>
					}
					{isWhatsApp && (recipientCount === 1) ? (
						<Button onClick={() => this.send(user)}>Send WhatsApp</Button>
					) : ''}
					{ recipientNames ? (
						<React.Fragment>
							<p>
								Once {"you've"} sent the messages, click the button below to automatically
								create a note in Raisely that you sent a message to {recipientNames}
							</p>
							<Button onClick={this.saveInteraction} target="whatsapp" disabled={saving}>
								{saving ? 'Saving' : 'Save'} a Record of Messages
							</Button>
						</React.Fragment>
					) : '' }
					{closeModal ? (
						<Button theme="secondary" onClick={closeModal()}>Done</Button>
					) : (
						<ReturnButton {...props} saveLabel="Done" />
					)}
				</div>
			);
		}

		sendAll = () => {
			const { selectedRecipients, recipientFields, contactSettings } = this.state;
			const { subject, body, emailClient } = contactSettings;
			const { to } = this.props;
			// Create the bcc list of users
			const recipients = to
				// Filter the selected ones
				.filter(u => selectedRecipients[u.uuid])
				// Filter any disabled users (ie they don't have an email)
				.filter(u => recipientFields.find(f => (f.id === u.uuid) && !f.disabled));
			const bcc = recipients
				.map(u => u.email)
				.join(';');
			const recentlySent = recipients.map(u => ({
				userUuid: u.uuid,
				subject,
				body,
				emailClient,
				type: 'email',
				name: u.preferredName || u.fullName,
			}));
			const allSent = (this.state.allSent || []).concat(recentlySent);

			const urlMap = {
				gmail: `https://mail.google.com/mail/?view=cm&fs=1&tf=1&bcc=${bcc}&su=${subject}&body=${body}`,
				yahoo: `http://compose.mail.yahoo.com/?bcc=${bcc}&subject=${subject}&body=${body}`,
			};
			const url = urlMap[emailClient];
			// Open the message composer
			if (url) window.open(url);
			// eslint-disable-next-line object-curly-newline
			this.setState({ state: 'email', allSent, recentlySent, emailContent: { bcc, subject, body } });
		}
		send = (user) => {
			if (!WhatsAppButton) WhatsAppButton = WhatsAppButtonRef().html;
			if (!user) {
				console.log('Send called with no user, ignoring');
			}
			const { contactSettings } = this.state;
			const { subject, body } = contactSettings;
			const url = WhatsAppButton.generateUrl(user.phoneNumber, body);
			window.open(url);
			const allSent = (this.state.allSent || []).concat([user.uuid]);
			const recentlySent = (this.state.recentlySent || []);
			recentlySent.push({
				userUuid: user.uuid,
				subject,
				body,
				type: 'email',
				name: user.preferredName || user.fullName,
			});
			this.setState({ allSent, recentlySent });
		}
		emailReturn = () => {
			this.setState({ state: 'step1' });
		}
		saveInteraction = async () => {
			const { recentlySent } = this.state;
			const { messageType } = this.props;
			try {
				this.setState({ saving: true });
				const promises = recentlySent.map((message) => {
					// eslint-disable-next-line object-curly-newline
					const { body, subject, userUuid, type, emailClient } = message;
					const data = {
						userUuid,
						categoryUuid: type === 'email' ? 'personal.email' : 'personal.message',
						detail: {
							readOnly: false,
							private: { body, subject, messageType },
						},
					};
					if (type === 'whatsapp') data.detail.private.method = 'WhatsApp';
					if (type === 'email') data.detail.private.emailClient = emailClient;

					return getData(api.interactions.create({ data }));
				});
				await Promise.all(promises);

				this.setState({ saving: false, recentlySent: [], state: 'step1' });
			} catch (e) {
				console.error(e);
				this.setState({ saving: false, error: e.message });
			}
		}

		sendEmailPanel() {
			const { body, subject, bcc } = this.state.emailContent;
			const { sendBy } = this.state.contactSettings;
			const { saving } = this.state;
			return (
				<div className="contact--form__email">
					{sendBy === 'other' ? (
						<div className="contact--form__copy-email">
							<p>Copy and paste the following into an email to send to guests</p>
							<div className="contact--form__email-content">
								<div>{bcc}</div>
								<div>Subject: {subject}</div>
								<div>{body}</div>
							</div>
						</div>
					) : ''}
					<p>Did you send the email? (Clicking yes will save a record of the email in Raisely)</p>
					<Button onClick={this.emailReturn}>No</Button>
					<Button theme="cta" disabled={saving} onClick={this.saveInteraction}>
						{saving ? 'Saving' : 'Yes'}
					</Button>
				</div>
			);
		}

		render = () => {
			const { props } = this;
			if (!this.state) return '';
			// eslint-disable-next-line object-curly-newline
			const { state, selectedRecipients, contactSettings, error, recipientFieldsKey, contactSettingsKey } = this.state;
			const { sendBy } = contactSettings;
			const { to } = props;

			const contactSteps = [{ fields: this.state.contactFields }];
			const recipientSteps = [{ fields: this.state.recipientFields }];
			const recipientCount = to.length;

			return (
				<div className="contact--form">
					{ state === 'email' ?
						this.sendEmailPanel() :
						(
							<React.Fragment>
								<div className="contact--form__content">
									<CustomForm
										key={contactSettingsKey}
										{...props}
										unlocked
										steps={contactSteps}
										values={[contactSettings]}
										updateValues={this.onContactChange}
										hideButtons
									/>
									{recipientCount < 2 && error ? (
										<div className="error">{ error }</div>
									) : '' }
									{recipientCount < 2 ? this.buttons(recipientCount) : ''}
								</div>
								{recipientCount > 1 ? (
									<div className="contact--form__recipients">
										<h4>Send To</h4>
										{ error ? (
											<div className="error">{ error }</div>
										) : '' }
										{sendBy === 'whatsapp' ? (
											<p>Click on each recipient below to send a WhatsApp to them</p>
										) : '' }

										<CustomForm
											key={recipientFieldsKey}
											{...props}
											unlocked
											steps={recipientSteps}
											values={[selectedRecipients]}
											updateValues={this.onRecipientChange}
											hideButtons
										/>
										{this.buttons(recipientCount)}
									</div>
								) : ''}
							</React.Fragment>
						)}
				</div>
			);
		}
	};

	return function ContactFormModalWrapper(props) {
		let { launchButtonLabel } = props;
		const { to } = props;

		function inner(closeModal) {
			return <ContactForm {...props} closeModal={closeModal} />;
		}

		if (!to) launchButtonLabel = Spinner;

		return launchButtonLabel ? (
			<Modal
				button
				buttonTitle={launchButtonLabel}
				modalContent={inner}
			/>
		) : inner();
	}
};
