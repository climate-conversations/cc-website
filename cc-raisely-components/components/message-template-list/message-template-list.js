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

	class ShowMessageTemplate extends React.Component {
		state = { expanded: false }
		toggleExpand = () => {
			const expanded = !this.state.expanded;
			this.setState({ expanded });
		}
		inner() {
			const { expanded } = this.state;
			const { forceExpand } = this.props;
			if (!(expanded || forceExpand)) return '';
			const { template } = this.props;
			const { body, subject } = template;
			const bodyHtml = { __html: body };
			return (
				<div className="message-template-list-item__inner">
					<div className="message-template-list-item__subject">{subject}</div>
					<div className="message-template-list-item__body">
						<div dangerouslySetInnerHTML={bodyHtml} />
					</div>
				</div>
			);
		}
		render() {
			const { template, messageType } = this.props;
			const { id } = template;
			const { value, period, field } = get(template, 'sendAfter', {});
			const relative = friendlyFields[field] || '';
			const interval = Math.abs(value);
			const direction = value < 0 ? 'before' : 'after';
			const timing = `${interval} ${period} ${direction} ${relative}`;

			const isSingle = specialMessages.includes(messageType);
			const title = template.id || template.subject || 'Click to expand';

			const editLink = isSingle ?
				`/templates/special/${messageType}` :
				`/templates/${messageType}/${id}`;
			const cloneLink = `/templates/create?clone=${id}`;
			return (
				<li className="message-template-list-item" onClick={this.toggleExpand}>
					<div className="message-template-list-item__title">
						<div className="message-template-list-item__title_id">{title}</div>
						{isSingle ? '' : (
							<div className="message-template-list-item__title_timing">{timing}</div>
						)}
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
					{this.inner()}
				</li>
			);
		}
	}

	return class MessageTemplateList extends React.Component {
		state = { loading: true };
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
		toggleExpand = () => { this.setState({ forceExpand: !this.state.forceExpand }); }
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

			return (
				<section className="message-template-list__section">
					<h3>{title}</h3>
					<div className="message-template-list__section-buttons">
						<Button theme="secondary" onClick={this.toggleExpand}>
							{forceExpand ? 'Collapse' : 'Expand'} All
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
									deleteTemplate={this.deleteTemplate}
									template={template}
									messageType={messageType}
									forceExpand={forceExpand} />
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
