(RaiselyComponents, React) => {
	const { api, Form } = RaiselyComponents;
	const { Button } = RaiselyComponents.Atoms;
	const { getData } = api;

	const WhatsAppButton = RaiselyComponents.import('whatsapp-button');
	const ReturnButton = RaiselyComponents.import('return-button');

	const initialContactFields = [{
		label: 'Subject',
		id: 'description',
		type: 'text',
		recordType: 'message',
	}, {
		label: 'Message',
		id: 'description',
		type: 'textarea',
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

	return class ContactForm extends React.Component {
		componentDidMount() {
			this.initRecipients();
			this.initContactFields();

			const [parentElement] = document.getElementsByClassName('contact--form__recipients');

			parentElement.click((e) => {
				this.send(e.target.id);
			});
		}

		onContactChange = (contactSettings) => {
			const { contactFields } = this.state;
			// Disable/enable email client if email is selected
			const emailClient = contactFields.find(f => f.id === 'emailClient');
			emailClient.type = contactFields.sendBy === 'email' ? 'select' : 'hidden';

			this.setState({ contactSettings });
		}
		onRecipientChange = (selectedRecipients) => {
			this.setState({ selectedRecipients });
		}

		/**
		 * Activate/deactive recipients if they have a phoneNumber/email
		 * depending on selected contact method
		 */
		setActiveRecipients() {
			const { recipientFields, contactSettings, allSent } = this.state;
			const { sendBy } = contactSettings;
			const { to } = this.props;
			recipientFields.forEach((field) => {
				const user = to.find(u => u.uuid === field.id);
				const hasPhone = userHasPhone(user);
				const hasEmail = userHasEmail(user);

				/* eslint-disable no-param-reassign */
				if (sendBy === 'whatsapp' || (hasPhone && !hasEmail)) {
					const sent = (allSent || []).find(s => s.userUuid === user.uuid);
					field.type = 'rich-description';
					field.default = `<div>${sent}<a id=${user.uuid}>${user.fullName || user.preferredName}</a></div>`;
				} else {
					field.type = 'checkbox';
					field.disabled = !(sendBy === 'whatsapp' ? userHasPhone(user) : userHasEmail(user));
				}
				/* eslint-enable no-param-reassign */
			});
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

			this.setState({ contactFields, contactSettings }, this.setActiveRecipients);
		}

		initRecipients() {
			const to = this.props;
			if (!Array.isArray(to)) {
				throw new Error('No recipients specified!');
			}
			const selectedRecipients = {};
			const recipientFields = to.map((user) => {
				selectedRecipients[user.uuid] = true;
				return {
					label: user.fullName || user.preferredName,
					id: user.uuid,
					type: 'checkbox',
					active: true,
					core: true,
					default: true,
				};
			});

			this.setState({ selectedRecipients, recipientFields });
		}

		buttons = () => {
			const { contactSettings, recentlySent } = this.state;
			if (contactSettings.sendBy === 'whatsapp') {
				return (
					<p>Click on the ${"people's"} names above to send a WhatsApp message</p>
				);
			}
			const recipientNames = recentlySent && recentlySent.length ?
				recentlySent.map(r => r.name).join(', ') :
				false;

			return (
				<div className="contact--form__buttons">
					<Button onClick={this.sendAll} target="_blank">Send Email</Button>
					{ recipientNames ? (
						<React.Fragment>
							<p>Once {"you've"} sent the messages, click the button below to automatically create a note in Raisely that you sent a message to ${recipientNames}</p>
							<Button onClick={this.saveInteraction} target="whatsapp">Save a Record of Messages</Button>
						</React.Fragment>
					) : '' }
					<ReturnButton saveLabel="Done" />
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
			this.setState({ state: 'email', allSent, recentlySent, bcc });
		}
		send = (user) => {
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
		saveInteraction = async () => {
			const { recentlySent } = this.state;
			const { messageType } = this.props;
			try {
				const promises = recentlySent.map((message) => {
					// eslint-disable-next-line object-curly-newline
					const { body, subject, userUuid, type, emailClient } = message;
					const data = {
						userUuid,
						categoryUuid: type === 'email' ? 'personal.email' : 'personal.message',
						detail: { private: { body, subject, messageType } },
					};
					if (type === 'whatsapp') data.detail.private.method = 'WhatsApp';
					if (type === 'email') data.detail.private.emailClient = emailClient;

					return getData(api.interactions.create({ data }));
				});
				await Promise.all(promises);

				this.setState({ recentlySent: [], state: 'step1' });
			} catch (e) {
				console.error(e);
				this.setState({ error: e.message });
			}
		}

		sendEmailPanel() {
			const { body, subject, bcc } = this.state;
			return (
				<div className="contact--form__email">
					<p>Copy and paste the following into an email to send guests</p>
					<p>Did you send the email? (Clicking yes will save a record of the email in Raisely)</p>
					<Button>No</Button>
					<Button onClick={this.saveInteraction}>Yes</Button>
				</div>
			);
		}

		render() {
			const { props } = this;
			if (!this.state) return '';
			// eslint-disable-next-line object-curly-newline
			const { state, selectedRecipients, contactSettings, error } = this.state;
			const { sendBy } = contactSettings;

			return (
				<div className="contact--form">
					{ state === 'email' ? this.sendEmailPanel() : (
						<React.Fragment>
							<div className="contact--form__content">
								{sendBy === 'whatsapp' ? (
									<p>Click on each recipient below to send a WhatsApp to them</p>
								) : '' }
								<Form
									{...props}
									unlocked
									fields={this.state.contactFields}
									values={contactSettings}
									onChange={this.onContactChange}
								/>
							</div>
							<div className="contact--form__recipients">
								<h5>Send To</h5>
								{ error ? (
									<div className="error">{ this.state.error }</div>
								) : '' }
								<Form
									{...props}
									unlocked
									fields={this.state.recipientFields}
									values={selectedRecipients}
									onChange={this.onRecipientChange}
									buttons={this.buttons}
								/>
							</div>
						</React.Fragment>
					)}
				</div>
			);
		}
	};
};
