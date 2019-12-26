(RaiselyComponents, React) => {
	const { Icon, Button } = RaiselyComponents.Atoms;
	const { get, dayjs } = RaiselyComponents.Common;
	const { api, Spinner, Link } = RaiselyComponents;
	const { getData } = api;

	const RaiselyButton = RaiselyComponents.import('raisely-button');
	const FacilitatorRef = RaiselyComponents.import('facilitator', { asRaw: true });
	let Facilitator;

	const icons = {
		public: 'public',
		private: 'supervised_user',
		corporate: 'accessibility_new',
	};

	class Host extends React.Component {
		componentDidMount() {
		}

		render() {
			const { host, showFacil } = this.props;
			const url = `/hosts/${host.uuid}`;
			const conversationName = (host.conversation === true) ?
				'...' : get(host.conversation, 'name', '...');

			const name = get(host, 'user.fullName') ||
				get(host, 'user.preferredName') ||
				get(host, 'user.email') ||
				'...';

			const facilName = get(host, 'facilitator.preferredName') ||
				get(host, 'faciltiator.fullName') ||
				"(couldn't load facil)";

			return (
				<li className="" key={host.uuid}>
					<Link className="list__item host-list-item" href={url}>
						<div className="list__item--title">
							{name}
							<div className="list__item--subtitle">
								{host.conversation ? conversationName : '(no conversation)'}
								{showFacil ? <div className="host-facil"> - {facilName}</div> : ''}
							</div>
						</div>
						<div className="host-status">{get(host, 'private.status', '...')}</div>
						<Button>contact</Button>
						<RaiselyButton recordType="user" uuid={host.userUuid} />
					</Link>
				</li>
			);
		}
	}

	return class FacilHostList extends React.Component {
		state = { filter: true, loading: true };

		componentDidMount() {
			// Cache conversations and facilitators by uuid
			this.conversations = {};
			this.facilitators = {};
			this.load();
		}

		setHosts = () => {
			const hostStatus = ['lead', 'interested', 'booked', 'hosted', 'not interested'];
			const filterStatus = ['lead', 'interested', 'booked'];
			Facilitator = FacilitatorRef().html;
			const isTeam = Facilitator.isTeamMode(this.props);

			let { hosts } = this;
			if (this.state.filter) {
				hosts = hosts
					.filter(h => filterStatus.includes(get(h, 'detail.private.status')))
					// Ensure visible hosts have conversation
					.forEach((host) => {
						if (!host.conversation) {
							const uuid = get(host, 'detail.private.conversationUuid');
							if (uuid) {
								// Multiple hosts may come from the same conversation
								// so cache the promise to retrieve so we only fetch it
								// once, and add a then callback to the promise for each host
								if (!this.conversations[uuid]) {
									this.conversations[uuid] = getData(api.events.get({ id: uuid }))
										.catch(e => this.setState({ error: e }));
									// eslint-disable-next-line no-param-reassign
									host.conversation = true;
								}
								this.conversations[uuid]
									// eslint-disable-next-line no-param-reassign
									.then((c) => {
										host.conversation = c;
										this.setState({ hosts });
									});
							}
						}
						if (isTeam && !host.facilitator) {
							// eslint-disable-next-line no-param-reassign
							host.facilitator = this.facilitators[get(host, 'private.facilitatorUuid')];
						}
					});
			}

			this.setState({ hosts, loading: false });
		}

		async getUserUuids() {
			if (!Facilitator) Facilitator = FacilitatorRef().html;
			const facilitators = await Facilitator.getTeamOrFacilitators(this.props);
			const uuids = facilitators
				.map((f) => {
					// Save the facilitator in the uuid map
					this.facilitators[f.uuid] = f;
					// Map it to it's uuid to create the query param
					return f.uuid;
				})
				.join(',');
			return uuids;
		}

		async load() {
			try {
				const userUuid = await this.getUserUuids();
				this.hosts = await getData(api.interactions.getAll({
					query: {
						private: 1,
						category: 'host-interest',
						facilitatorUuid: userUuid,
						join: 'user',
					},
				}));

				this.setHosts();

				// this.hosts = [{
				// 	userUuid: '9f0175c0-da2c-11e9-8213-bb2b7acc1c0d',
				// 	conversation: { name: "Chris's Conversation" },
				// 	user: { fullName: 'Abhinav Andul' },
				// 	private: { status: 'booked' },
				// 	facilitator: { preferredName: 'Chris' },
				// },
				// {
				// 	userUuid: '9f0175c0-da2c-11e9-8213-bb2b7acc1c0d',
				// 	conversation: { name: "Chris's Conversation" },
				// 	user: { fullName: 'Harris' },
				// 	private: { status: 'lead' },
				// 	facilitator: { preferredName: 'Chris' },
				// }];
			} catch (error) {
				console.error(error);
				this.setState({ error, loading: false });
			}
		}

		toggleFilter = () => {
			// If we're about to switch to filtered
			this.setState({	filter: !this.state.filter }, this.setHosts);
		}

		render() {
			const now = dayjs();
			const { filter, loading, error } = this.state;

			if (loading) return <Spinner />;

			if (!Facilitator) Facilitator = FacilitatorRef().html;
			const isTeam = Facilitator.isTeamMode(this.props);

			return (
				<div className="host-list__wrapper list__wrapper">
					{error ? (
						<div className="error">{error.message}</div>
					) : (
						<React.Fragment>
							{this.hosts.length ? (
								<Button className="list__toggle" onClick={this.toggleFilter}>
									{filter ? 'Show All' : 'Hide Complete' }
								</Button>
							) : ''}
							{this.hosts.length ? (
								<ul className="host-list">
									{this.hosts.map(host => (
										<Host
											key={host.uuid}
											{...this.props}
											now={now}
											showFacil={isTeam}
											host={host} />
									))}
								</ul>
							) : (
								<p>You have no {this.hosts.length ? 'unbooked' : ''} hosts</p>
							)}
						</React.Fragment>
					)}
				</div>
			);
		}
	};
};
