(RaiselyComponents, React) => {
	const { api } = RaiselyComponents;
	const { getData, getQuery } = api;
	const { get, set } = RaiselyComponents.Common;

	const CustomForm = RaiselyComponents.import('custom-form');

	const messageFields = [{
		label: 'id for this message',
		id: 'id',
		type: 'text',
	}, {
		label: 'Send this message',
		id: 'interval',
		type: 'integer',
		default: 1,
	}, {
		label: '',
		id: 'period',
		type: 'select',
		options: [
			{ label: 'hours', value: 'hours' },
			{ label: 'days', value: 'days' },
			{ label: 'weeks', value: 'weeks' },
		],
	}, {
		label: '',
		id: 'direction',
		type: 'select',
		options: [
			{ label: 'before', 'value': 'before'} ,
			{ label: 'after', 'value': 'after' },
		],
	}, {
		label: '',
		id: 'field',
		type: 'select',
		options: [
			{ value: 'startAt', label: 'Conversation start time' },
			{ value: 'private.processAt', label: 'when the facilitator plans to process conversation' },
			{ value: 'createdAt', label: 'the host first expressed interest'} ,
		],
	}, {
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
	}];
	const messageSteps = [{ fields: messageFields }];

	const messageTypeKey = type => `${type}Messages`;
	function messageToForm(message) {
		message.direction = (message.interval < 0) ? 'before' : 'after';
		message.interval = Math.abs(message.interval);
		return message;
	}
	function formToMessage(message) {
		message.type = message.field === 'createdAt' ? 'host' : 'conversation';
		if (message.direction === 'before') message.interval = 0 - message.interval;
		return message;
	}

	return class MessageEditor extends React.Component {
		getMessage(type, id) {
			const key = messageTypeKey(type);
			const messages = get(this.props, `campaign.private.${key}`, []);
			return messages.find(m => m.id === id);
		}
		setMessage(message) {
			const key = messageTypeKey(message.type);
			const messages = get(this.props, `campaign.private.${key}`, []);
			const existing = messages.find(m => m.id === message.id);
			if (existing) {
				Object.assign(existing, message);
			} else {
				messages.push(existing);
			}
		}

		load = ({ dataToForm }) => {
			const { type, id } = this.props.match.params;
			const query = getQuery(get(this.props, 'router.location.search'));

			const { clone } = query;
			// eslint-disable-next-line object-curly-newline
			this.setState({ id, type, query, clone });

			if (!(id || clone)) return null;

			let message = this.getMessage(type, id);

			if (clone) {
				message = {...message};
				message.sendAfter
			}

			return dataToForm(message);
		}

		save = (values, formToData) => {
			const { message } = formToData(values);
			this.setMessage(message);
			getData(api.campaigns.update());
		}
		render() {
			const { props } = this;
			return (
				<CustomForm
					{...props}
					unlocked
					steps={messageSteps}
					redirectToReturnTo
				/>
			);
		}
	};
};
