(RaiselyComponents, React) => {
	const { api, Spinner } = RaiselyComponents;
	const { Button } = RaiselyComponents.Atoms;
	const { getData } = api;
	const { get } = RaiselyComponents.Common;
	const { Modal } = RaiselyComponents.Molecules;

	const CustomForm = RaiselyComponents.import('custom-form');
	const WhatsAppButtonRef = RaiselyComponents.import('whatsapp-button', { asRaw: true });
	const ReturnButton = RaiselyComponents.import('return-button');
	const MessageFormatRef = RaiselyComponents.import('message-format', { asRaw: true })
	let WhatsAppButton;
	let MessageFormat;

	const contactDefaults = { sendBy: 'whatsapp', emailClient: 'gmail' };

	const initialContactFields = [{
		id: 'messageInstructions',
		type: 'rich-description',
		default: "Edit the message you want to send below. A copy of this message will be automatically saved on the records of the recipients when you click send. This helps us keep good records of the contact we've had with people.",
	} ,{
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
			{ label: 'Hotmail', value: 'hotmail' },
			{ label: 'Other Email App', value: 'other' },
		],
	}].map(field => Object.assign(field, { active: true, core: true }));

	const userHasEmail = user => (user.email && !user.email.endsWith('.invalid'));
	const getLabel = user => user.fullName || user.preferredName ||
		(userHasEmail(user) && user.email) || user.phoneNumber;

	function toggleEmailClient(contactFields, contactSettings) {
		const emailClient = contactFields.find(f => f.id === 'emailClient');
		emailClient.type = contactSettings.sendBy === 'email' ? 'select' : 'hidden';
		return emailClient;
	}

	function Checkbox({ label, onChange, value, disabled }) {
		const labelClass = `form-field__label-text ${disabled ? 'disabled' : ''}`;
		return (
			<div className="field-wrapper">
				<div className="form-field form-field--checkbox form-field--not-empty form-field--valid">
					<label onClick={() => !disabled && onChange({ value: !value })}>
						<input
							type="checkbox"
							onChange={(e) => {
								e.stopPropagation();
								if (!disabled) {
									onChange(!value);
								}
							}}
							disabled={disabled}
							className="form-field--checkbox__inline"
							checked={value} />
						<span className={labelClass}>{label}</span>
					</label>
				</div>
			</div>
		);
	}

	function WhatsAppLink({ recipient, onClick }) {
		if (recipient.sent || !recipient.phoneNumber) {
			return <p>{recipient.label} {recipient.sent ? '(sent)' : ''}</p>;
		}
		return (
			<Button
				className="link"
				theme="link"
				onClick={() => onClick(recipient)}>
					{recipient.label} ({recipient.phoneNumber})
			</Button>
		)
	}

	function RecipientList({ recipients, sendBy, selectedRecipients, toggleRecipient, onClick }) {
		if (!Array.isArray(recipients)) return null;
		const hasWhatsapp = recipients.find(r => r.phoneNumber && !r.email);
		return (
			<div className="contact--form__recipients--whatsapp-wrapper">
				{hasWhatsapp ? (
					<p>Some recipients do not have an email address. Click on the underlined recipients below to send them a WhatsApp</p>
				) : ''}
				<ul className="contact--form__recipients--whatsapp-list">
					{recipients.map(r => (
						<li key={r.uuid}>
							{((sendBy === 'email') && r.email) ? (
								<Checkbox
									label={`${r.label} ${r.sent ? '(sent)' : ''}`}
									onChange={(value) => toggleRecipient(r.uuid, value)}
									value={selectedRecipients[r.uuid]}
									disabled={r.disabled || r.sent}
								/>
							) : (
								<WhatsAppLink
									recipient={r}
									onClick={onClick} />
							)}
						</li>
					))}
				</ul>
			</div>
		);
	}

	class ContactForm extends React.Component {
		state = { prepared: false };
		componentDidMount() {
			if (!MessageFormat) MessageFormat = MessageFormatRef().html;
			this.load();
		}
		componentDidUpdate(prevProps) {
			// Check if any relevant properties have changed
			let hasChanged = ['to', 'sendBy', 'body', 'subject', 'emailClient', 'messageMeta', 'messageData']
				.find(key => this.props[key] !== prevProps[key]);

			if (hasChanged) {
				this.load();
			}
		}
		load() {
			this.initRecipients();
			this.initContactFields();
			this.setState({ prepared: true });
		}

		onContactChange = (values) => {
			console.log('Contact Change: ', values);
			const { to } = this.props;
			const contactSettings = values[0];
			let { contactFields } = this.state;
			// Disable/enable email client if email is selected
			if (to.length > 1) {
				const newContactFields = contactFields.map(f => ({ ...f }));
				const oldEmailClient = contactFields.find(f => f.id === 'emailClient');
				const emailClient = toggleEmailClient(newContactFields, contactSettings);
				// If this has changed, force a repaint of the fields
				if (oldEmailClient.type !== emailClient.type) {
					contactFields = newContactFields;
				}
			}

			this.setState({ contactSettings, contactFields }, this.setActiveRecipients);
		}
		initContactFields() {
			// Don't mess up the initial fields
			const { to } = this.props;
			let contactFields = initialContactFields.map(f => ({ ...f }));
			// Don't show send by field for 1 recipient
			if (to.length === 1) {
				contactFields = contactFields.filter(f => f.id !== 'sendBy');
			}

			const { sendBy, body, subject, emailClient } = Object.assign(contactDefaults, this.props);

			// this.setState({ body });
			contactFields.find(f => f.id === 'body').default = body;

			const contactSettings = {
				sendBy,
				body,
				subject,
				emailClient,
			};
			toggleEmailClient(contactFields, contactSettings);

			this.setState({
				contactFields,
				contactSettings,
				contactSettingsKey: new Date().toISOString(),
			}, this.setActiveRecipients);


			setTimeout(() => {
				const toggle = sendBy === 'whatsapp' ? 'email' : 'whatsapp';
				let newContactSettings = { ...contactSettings, body, sendBy: toggle };
				this.onContactChange([newContactSettings]);
				newContactSettings = { ...contactSettings, body, sendBy };
				this.onContactChange([newContactSettings]);
			}, 250);
		}

		initRecipients() {
			const { to } = this.props;
			if (!Array.isArray(to)) {
				throw new Error('No recipients specified!');
			}
			const selectedRecipients = {};
			const recipientFields = to.map((user) => {
				const { email, phoneNumber } = user;
				const hasEmail = userHasEmail(user);
				selectedRecipients[user.uuid] = hasEmail;
				let label = getLabel(user) || '';
				if (!hasEmail && !phoneNumber) label += ' (uncontactable guest)';
				return {
					label,
					uuid: user.uuid,
					disabled: !label,
					email: hasEmail && email,
					phoneNumber,
					sent: false,
				};
			});

			this.setState({ selectedRecipients, recipientFields });
		}

		buttons = (recipientCount) => {
			const { props } = this;
			const { closeModal, to } = props;
			const { contactSettings } = this.state;

			const isWhatsApp = contactSettings.sendBy === 'whatsapp';

			const user = to[0];

			return (
				<div className="contact--form__buttons">
					{isWhatsApp && (recipientCount === 1) ? (
						<Button onClick={() => this.send(user, closeModal)}>Send WhatsApp</Button>
					) : ''}
					{!isWhatsApp || (recipientCount === 1) ? (
						<Button onClick={() => this.sendAll(recipientCount === 1 ? closeModal : null)} target="_blank">Send Email</Button>
					) : ''}
					{closeModal ? (
						<Button theme="secondary" onClick={() => closeModal()}>Done</Button>
					) : (
						<ReturnButton {...props} saveLabel="Done" />
					)}
				</div>
			);
		}

		finalPage = () => {
			const recipients = this.recipientsRemaining();
			const { recipientFields } = this.state;
			const invalidRecipients = recipientFields.filter(r => !(r.phoneNumber || r.email));
			return (
				<div className="contact--form">
					<div className="contact--form__final">
						{recipients.sent ? <p>Great! {"You've"} sent messages to all valid recipients.</p> : ''}
						{recipients.invalid ? (
							<React.Fragment>
								<p>The folllowing recipients could not be messaged because they have no valid contact details</p>
								<ul>
									{invalidRecipients.map(r => (
										<li key={r.uuid}>{r.label}</li>
									))}
								</ul>
							</React.Fragment>
						) : ''}
					</div>
				</div>
			)
		}

		sendAll = async (closeModal) => {
			const { selectedRecipients, recipientFields, contactSettings } = this.state;
			const { subject, body: htmlBody, emailClient } = contactSettings;

			let body = await MessageFormat.format(htmlBody, 'email');
			// Variable substitution, insert the selected user
			// for the value of user
			const data = {
				...get(this.props, 'messageData', {}),
				user: { preferredName: 'Everyone' },
			};

			body = MessageFormat.substitute(body, data);

			const { to } = this.props;
			// Create the bcc list of users
			const recipients = to
				// Filter the selected ones
				.filter(u => selectedRecipients[u.uuid])
				// Filter any disabled users (ie they don't have an email)
				.filter(u => recipientFields.find(f => (f.uuid === u.uuid) && !f.disabled));
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

			const urlMap = {
				gmail: `https://mail.google.com/mail/?view=cm&fs=1&tf=1&bcc=${bcc}&su=${subject}&body=${encodeURI(body)}`,
				yahoo: `http://compose.mail.yahoo.com/?bcc=${bcc}&subject=${subject}&body=${encodeURI(body)}`,
				hotmail: `https://dub130.mail.live.com/default.aspx?rru=compose&subject=${subject}&body=${encodeURI(body)}&bcc=${bcc}#page=Compose`,
			};
			const url = urlMap[emailClient];
			if (url) {
				console.log(`Opening ${emailClient} composer`);
				// Open the message composer
				window.open(url);
				// Save the interaction immediately and close the modal if necessary
				const canClose = await this.saveInteraction(recentlySent)
				if (canClose && closeModal) closeModal();
			} else {
				// eslint-disable-next-line object-curly-newline
				this.setState({ state: 'email', recentlySent, emailContent: { bcc, subject, body } });
			}
		}
		send = async (user, closeModal) => {
			if (!WhatsAppButton) WhatsAppButton = WhatsAppButtonRef().html;
			if (!user) {
				console.log('Send called with no user, ignoring');
			}
			const { contactSettings } = this.state;
			const { subject, body: htmlBody } = contactSettings;
			let body = await MessageFormat.format(htmlBody, 'whatsapp');
			// Variable substitution, insert the selected user
			// for the value of user
			const data = {
				...get(this.props, 'messageData', {}),
				user,
			};

			body = MessageFormat.substitute(body, data);

			const url = WhatsAppButton.generateUrl(user.phoneNumber, body);
			window.open(url);
			const message = {
				userUuid: user.uuid,
				subject,
				body,
				type: 'whatsapp',
				name: user.preferredName || user.fullName,
			};
			this.saveInteraction([message])
				.then((canClose) => {
					user.sent = true;
					const { selectedRecipients } = this.state;
					selectedRecipients[user.uuid] = false;
					this.setState({ selectedRecipients });
					if (canClose && closeModal) closeModal();
				});
		}
		saveInteraction = async (messages) => {
			let messageMeta = this.props.messageMeta || {};
			const { selectedRecipients, recipientFields } = this.state;
			try {
				this.setState({ saving: true });
				const promises = messages.map(async (message) => {
					// eslint-disable-next-line object-curly-newline
					const { body, subject, userUuid, type, emailClient } = message;
					const data = {
						userUuid,
						categoryUuid: type === 'email' ? 'personal.email' : 'personal.message',
						detail: {
							readOnly: false,
							private: {
								body,
								subject,
								...messageMeta,
							},
						},
					};
					if (type === 'whatsapp') data.detail.private.method = 'WhatsApp';
					if (type === 'email') data.detail.private.emailClient = emailClient;

					const result = await getData(api.interactions.create({ data }));
					// Uncheck the recipient
					selectedRecipients[userUuid] = false;
					const recipient = recipientFields.find(r => r.uuid === userUuid);
					recipient.sent = true;
					return result;
				});
				await Promise.all(promises);

				const allSent = (this.state.allSent || []).concat(messages);

				this.setState({ saving: false, allSent, state: 'step1' });
			} catch (e) {
				console.error(e);
				this.setState({ saving: false, error: e.message });
				return false;
			}
			// Note whichever recipients were successful, force repaint
			this.setState({ selectedRecipients: {...selectedRecipients} });

			return true;
		}

		emailReturn = () => {
			this.setState({ state: 'step1' });
		}

		toggleRecipient = (uuid, value) => {
			const { selectedRecipients } = this.state;
			selectedRecipients[uuid] = value;
			this.setState({ selectedRecipients });
		}

		sendEmailPanel() {
			const { body, subject, bcc } = this.state.emailContent;
			const { recentlySent, saving } = this.state;
			return (
				<div className="contact--form__email">
					<div className="contact--form__copy-email">
						<p>Copy and paste the following into an email to send to guests</p>
						<div className="contact--form__email-content">
							<div>
								<span className="contact--form__label">BCC:</span>
								<span className="contact--form__value">{bcc}</span>
							</div>
							<div>
								<span className="contact--form__label">Subject:</span>
								<span className="contact--form__value">{subject}</span>
							</div>
							<div>
								<span className="contact--form__value">{body}</span>
							</div>
						</div>
					</div>
					<p>Did you send the email? (Clicking yes will save a record of the email in Raisely)</p>
					<Button onClick={this.emailReturn}>No</Button>
					<Button theme="cta" disabled={saving} onClick={() => this.saveInteraction(recentlySent)}>
						{saving ? 'Saving' : 'Yes'}
					</Button>
				</div>
			);
		}

		recipientsRemaining() {
			const { recipientFields } = this.state;
			const result = {
				sent: 0,
				invalid: 0,
				remaining: 0,
			};
			recipientFields.forEach(r => {
				if (r.sent) result.sent++;
				else if (r.email || r.phoneNumber) result.remaining++;
				else result.invalid++;
			});
			console.log('Recipients remaining', result)
			return result;
		}

		render = () => {
			const { props } = this;
			if (!this.state) return <Spinner />;
			// eslint-disable-next-line object-curly-newline
			const { state, selectedRecipients, contactSettings, error, recipientFieldsKey, contactSettingsKey, recipientFields, prepared } = this.state;

			if (!prepared) return <Spinner />;

			const { sendBy } = contactSettings;
			const { to } = props;

			const contactSteps = [{ fields: this.state.contactFields }];
			const recipientCount = to.length;

			let contactClass = "contact--form__content";
			if (recipientCount > 1) contactClass += ' split__screen';
			const recipients = this.recipientsRemaining();

			if (!recipients.remaining) return this.finalPage();

			return (
				<div className="contact--form">
					{ state === 'email' ?
						this.sendEmailPanel() :
						(
							<React.Fragment>
								<div className={contactClass}>
									<h4>Compose your message</h4>
									<CustomForm
										key={contactSettingsKey}
										{...props}
										unlocked
										steps={contactSteps}
										hideButtons
										values={[contactSettings]}
										updateValues={this.onContactChange}
									/>
									{recipientCount < 2 && error ? (
										<div className="error">{ error }</div>
									) : '' }
									{recipientCount < 2 ? this.buttons(recipientCount) : ''}
								</div>
								{recipientCount > 1 ? (
									<div className="contact--form__recipients split__screen">
										<h4>Send To</h4>
										{ error ? (
											<div className="error">{ error }</div>
										) : '' }
										<RecipientList
											key={recipientFieldsKey}
											recipients={recipientFields}
											sendBy={sendBy}
											selectedRecipients={selectedRecipients}
											toggleRecipient={this.toggleRecipient}
											onClick={this.send}
										/>
										{this.buttons(recipientCount)}
									</div>
								) : ''}
							</React.Fragment>
						)}
				</div>
			);
		}
	}

	return function ContactFormModalWrapper(props) {
		let { launchButtonLabel } = props;
		const { onClose, to, messageMeta } = props;

		function inner(closeModal) {
			return <ContactForm {...props} closeModal={closeModal} />;
		}

		if (!to) launchButtonLabel = Spinner;

		return launchButtonLabel ? (
			<Modal
				button
				buttonTitle={launchButtonLabel}
				modalContent={inner}
				onClose={onClose}
				messageMeta={messageMeta}
			/>
		) : inner();
	}
};
