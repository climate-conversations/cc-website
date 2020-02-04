(RaiselyComponents, React) => {
	const { api, Spinner } = RaiselyComponents;
	const { Button, Icon } = RaiselyComponents.Atoms;
	const { getData } = api;
	const { get, startCase } = RaiselyComponents.Common;

	const specialMessages = ['conversationGuestThankyou', 'conversationHostThankyou'];

	const messageTypes = ['hostMessages', 'conversationMessages'];

	const time = {
		hours: 1,
		days: 24,
		weeks: 24 * 7,
	};
	const friendlyFields = {
		startAt: 'conversation',
		'private.processAt': 'processing due',
		createdAt: 'expressing interest',
	};

	const descriptions = {
		conversationGuestThankyou: 'Thank you message to guests of a conversation',
		conversationHostThankyou: 'Thank you message to hosts of a conversation',
		hostMessages: 'Messages sent to a prospective host to set a date for a conversation',
		conversationMessages: 'Messages sent regarding a conversation, either before hand to the host, or after to new prospective hosts',
	};

	class ShowMessageTemplate extends React.Component {
		state = { expanded: {} }
		toggleExpand = (section) => {
			const expanded = { ...this.state.expanded };
			expanded[section] = !expanded[section];
			this.setState({ expanded });
		}
		inner(section) {
			const expanded = this.state.expanded[section];
			const { forceExpand } = this.props;
			if (!(expanded || forceExpand)) return '';
			const { template } = this.props;
			const { body, subject } = template;
			const bodyHtml = { __html: body };
			return (
				<div className="message-template-list-item__inner">
					<div className="message-template-list-item__subject">Subject: <strong>{subject}</strong></div>
					<div className="message-template-list-item__body">
						<div dangerouslySetInnerHTML={bodyHtml} />
					</div>
				</div>
			);
		}
		render() {
			const { template, messageType } = this.props;
			const { id } = template;
			const sendBy = template.sendBy || 'email';
			const { value, period, field } = get(template, 'sendAfter', {});
			const relative = friendlyFields[field] || '';
			const interval = Math.abs(value);
			const direction = value < 0 ? 'before' : 'after';
			const timing = `${interval} ${period} ${direction} ${relative}`;

			const isSingle = specialMessages.includes(messageType);
			let title = template.id || template.subject || 'Click to expand';
			if (!isSingle) title = `[${sendBy}] ${title}`;

			const editLink = isSingle ?
				`/templates/special/${messageType}` :
				`/templates/${messageType}/${id}`;
			const cloneLink = `/templates/create?clone=${id}`;
			return (
				<li className="message-template-list-item" onClick={() => this.toggleExpand(messageType)}>
					<div className="message-template-list-item__summary">
						<div className="message-template-list-item__title">
							{title}
							{isSingle ? '' : (
								<div className="message-template-list-item__title_timing">{timing}</div>
							)}
						</div>
						<div className="message-template-list-item__title_buttons">
							<Button href={editLink} theme="secondary">
								<Icon name="create" size="small" />
							</Button>
							{isSingle ? '' : (
								<React.Fragment>
									<Button theme="secondary" href={cloneLink}>
										<Icon name="file_copy" size="small" />
									</Button>
									<Button
										theme="danger"
										onClick={() => this.props.deleteTemplate(messageType, template.id)}>
										<Icon name="delete" size="small" />
									</Button>
								</React.Fragment>
							)}
						</div>
					</div>
					{this.inner(messageType)}
				</li>
			);
		}
	}

	return class MessageTemplateList extends React.Component {
		state = { loading: true, forceExpand: {} };
		componentDidMount() {
			this.load()
				.catch((e) => {
					console.error(e);
					this.setState({ error: e.message });
				});
		}
		getTemplates(messageType) {
			if (specialMessages.includes(messageType)) {
				const { campaign } = this.state;
				return [get(campaign, `private.${messageType}`, {
					subject: '',
					body: '',
				})];
			}
			return this.state[messageType];
		}
		toggleExpand = (section) => {
			const forceExpand = { ...this.state.forceExpand };
			forceExpand[section] = !forceExpand[section];
			this.setState({ forceExpand });
		}
		async load() {
			const { uuid } = this.props.global.campaign;
			const campaign = await getData(api.campaigns.get({
				id: uuid,
				query: { private: 1 },
			}));
			this.sortMessages(campaign);
			this.setState({ loading: false, campaign });
		}
		sortMessages(campaign) {
			const state = {};
			messageTypes.forEach((messageType) => {
				const messages = get(campaign, `private.${messageType}`, []);
				state[messageType] = messages
					// Normalize all the times in hours
					// so we can sort messages by order of occurance
					.map((m) => {
						const period = get(m, 'sendAfter.period', 'hours');
						const value = get(m, 'sendAfter.value', 1);
						// eslint-disable-next-line no-param-reassign
						m.order = time[period] * value;
						return m;
					})
					.sort((a, b) => a.order - b.order);
			});
			this.setState(state);
		}
		deleteTemplate = async (messageType, id) => {
			const confirmed = window.confirm(`Are you sure you want to delete the template ${id}?`);
			if (!confirmed) return;
			const { campaign } = this.state;
			const messages = get(campaign, `private.${messageType}`);
			const index = messages.findIndex(m => m.id === id);
			messages.splice(index, 1);
			try {
				const updatedCampaign = await getData(api.campaigns.update({
					id: campaign.uuid,
					data: {
						data: {
							private: campaign.private,
						},
					},
				}));
				this.setState({ campaign: updatedCampaign }, () => this.sortMessages());
			} catch (e) {
				console.error(e);
			}
		}

		renderSection(messageType) {
			const templates = this.getTemplates(messageType);
			const { loading, forceExpand } = this.state;
			const titleSuffix = (templates || [{}]).length === 1 ? 'Template' : 'Templates';
			const title = `${startCase(messageType)} ${titleSuffix}`;
			const isSingle = specialMessages.includes(messageType);
			const description = descriptions[messageType];

			return (
				<section className="message-template-list__section">
					<h3>{title}</h3>
					<div className="message-template-list__section-description">
						{description}
					</div>
					<div className="message-template-list__section-buttons">
						<Button theme="secondary" onClick={() => this.toggleExpand(messageType)}>
							{forceExpand[messageType] ? 'Collapse' : 'Expand'} All
						</Button>
						{isSingle ? '' : (
							<Button theme="primary" href="/templates/create">
								<Icon name="add" size="small" />
								Add Template
							</Button>
						)}
					</div>
					{loading ? <Spinner /> : (
						<ol className="message-template-list__list">
							{templates.map(template => (
								<ShowMessageTemplate
									key={template.id}
									deleteTemplate={this.deleteTemplate}
									template={template}
									messageType={messageType}
									forceExpand={forceExpand[messageType]} />
							))}
						</ol>
					)}
				</section>
			);
		}

		render() {
			return (
				<div className="message-template-list__wrapper">
					{specialMessages.map(id => this.renderSection(id))}
					{messageTypes.map(messageType => this.renderSection(messageType))}
				</div>
			);
		}
	};
};
