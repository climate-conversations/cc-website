/* eslint-disable no-param-reassign */
/**
 * Editor for message templates
 * Must be inserted on pages that have a url of that includes
 * :type
 * and :id for editing
 */
(RaiselyComponents, React) => {
	const { api, Spinner } = RaiselyComponents;
	const { getData, getQuery } = api;
	const { get, set } = RaiselyComponents.Common;

	const CustomForm = RaiselyComponents.import('custom-form');

	const specialMessages = ['conversationGuestThankyou', 'conversationHostThankyou'];

	const messageFields = [{
		label: 'id for this message',
		id: 'id',
		type: 'text',
		required: true,
		core: true,
		recordType: 'message',
	}, {
		label: 'Send this message',
		id: 'interval',
		type: 'integer',
		core: true,
		recordType: 'message',
	}, {
		label: '',
		id: 'period',
		type: 'select',
		options: [
			{ label: 'hours', value: 'hours' },
			{ label: 'days', value: 'days' },
			{ label: 'weeks', value: 'weeks' },
		],
		core: true,
		recordType: 'message',
	}, {
		label: '',
		id: 'direction',
		type: 'select',
			options: [
			{ label: 'before', value: 'before' },
			{ label: 'after', value: 'after' },
		],
		core: true,
		recordType: 'message',
	}, {
		label: '',
		id: 'field',
		type: 'select',
		options: [
			{ value: 'startAt', label: 'Conversation start time' },
			{ value: 'private.processAt', label: 'when the facilitator plans to process the conversation' },
			{ value: 'createdAt', label: 'the host first expressed interest' },
		],
		core: true,
		recordType: 'message',
	}, {
		label: 'Subject',
		id: 'subject',
		type: 'text',
		recordType: 'message',
		core: true,
	}, {
		label: 'Message',
		id: 'body',
		type: 'html',
		recordType: 'message',
		core: true,
		active: true,
	}, {
		label: 'Send by',
		id: 'sendBy',
		type: 'select',
		recordType: 'message',
		options: [
			{ label: 'WhatsApp', value: 'whatsapp' },
			{ label: 'Email', value: 'email' },
		],
		core: true,
	}];

	const defaultMessage = {
		body: '',
		subject: '',
		field: 'startAt',
		interval: '1',
		period: 'days',
		sendBy: 'email',
		direction: 'after',
	};

	const messageTypeKey = type => `${type}Messages`;
	function messageToForm(message) {
		const value = get(message, 'sendAfter.value', 0);
		message.direction = (value < 0) ? 'before' : 'after';
		message.interval = Math.abs(get(message, 'sendAfter.value'));
		message.period = get(message, 'sendAfter.period');
		message.field = get(message, 'sendAfter.field');
		return message;
	}
	function formToMessage(message) {
		if (!specialMessages.includes(message.id)) {
			message.type = message.field === 'createdAt' ? 'host' : 'conversation';
			message.sendAfter = {
				value: message.interval * (message.direction === 'before' ? -1 : 1),
				field: message.field,
				period: message.period,
			};
			delete message.interval;
			delete message.period;
			delete message.field;
			delete message.direction;
		}
		return message;
	}

	return class MessageEditor extends React.Component {
		state = {};
		getMessage(type, id) {
			if (specialMessages.includes(id)) {
				const message = get(this.campaign, `private.${id}`, {
					id, body: '', subject: '',
				});
				// Ensure message has id in editor
				message.id = id;
				return message;
			}
			const key = type.endsWith('Messages') ? type : messageTypeKey(type);
			const messages = get(this.campaign, `private.${key}`, []);
			return messages.find(m => m.id === id);
		}
		getMessageId() {
			return get(this.props, 'match.params.message');
		}
		setMessage(message) {
			if (specialMessages.includes(message.id)) {
				const { id } = message;
				delete message.id;
				set(this.campaign, `private.${id}`, message);
				return;
			}
			const key = messageTypeKey(message.type);
			const messages = get(this.campaign, `private.${key}`, []);
			const existing = messages.find(m => m.id === message.id);
			if (existing) {
				Object.assign(existing, message);
			} else {
				messages.push(message);
			}
			// In case the array isn't yet there
			set(this.campaign, `private.${key}`, messages);
		}
		prepareSteps() {
			let { messageSteps } = this.state;
			if (!messageSteps) {
				const messageId = this.getMessageId();
				const isEditMode = !!messageId;

				const alwaysShow = ['id', 'body', 'subject'];
				const fields = messageFields
					.filter(f => !specialMessages.includes(messageId) || alwaysShow.includes(f.id));

				if (isEditMode) {
					fields[0] = {
						id: 'id',
						type: 'rich-description',
						default: `Message id: ${messageId}`,
					};
				}
				messageSteps = [{ fields }];
				this.setState({ messageSteps });
			}
			return messageSteps;
		}

		load = async ({ dataToForm }) => {
			const { type, message: id } = this.props.match.params;
			const query = getQuery(get(this.props, 'router.location.search'));
			const { uuid } = this.props.global.campaign;
			this.campaign = await getData(api.campaigns.get({
				id: uuid,
				query: { private: 1 },
			}));

			const { clone } = query;
			// eslint-disable-next-line object-curly-newline
			this.setState({ type, query, clone });

			if (!(id || clone)) return dataToForm({ message: { ...defaultMessage } });

			let message = this.getMessage(type, id);

			if (!message) throw new Error(`Message not found ${type} ${id}`);

			if (clone) {
				message = { ...message };
				message.sendAfter = { ...message.sendAfter };
				message.id = null;
			}

			return dataToForm({ message: messageToForm(message) });
		}

		save = async (values, formToData) => {
			const data = formToData(values);
			let { message } = data;
			const messageId = this.getMessageId();
			if (messageId) message.id = messageId;
			if (!message.id) {
				throw new Error('Message must have an id');
			}
			message = formToMessage(message);
			this.setMessage(message);
			const updatedCampaign = await getData(api.campaigns.update({
				id: this.campaign.uuid,
				data: {
					data: {
						private: this.campaign.private,
					},
				},
			}));
			this.campaign = updatedCampaign;
		}
		render() {
			const { props } = this;
			const id = this.getMessageId();

			const messageSteps = this.prepareSteps();

			const title = id ? 'Edit Message Template' : 'New Message Template';
			return (
				<div className="message-template-editor__wrapper">
					<h3>{title}</h3>
					<CustomForm
						{...props}
						unlocked
						steps={messageSteps}
						controller={this}
						completeRedirect="/templates"
					/>
				</div>
			);
		}
	};
};
