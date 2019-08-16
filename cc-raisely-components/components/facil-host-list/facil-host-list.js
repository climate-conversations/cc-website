(RaiselyComponents, React) => {
	const { Icon, Button } = RaiselyComponents.Atoms;
	const { get, dayjs } = RaiselyComponents.Common;
	const { api, Spinner, Link } = RaiselyComponents;

	const icons = {
		public: 'public',
		private: 'supervised_user',
		corporate: 'accessibility_new',
	};

	async function getData(promise) {
		const response = await promise;
		const status = response.statusCode();
		if (status >= 400) {
			const message = get(response.body().data(), 'errors[0].message', 'An unknown error has occurred');
			console.error(response.body());
			throw new Error(message);
		}
		return response.body().data().data;
	}

	class Host extends React.Component {
		componentDidMount() {
		}

		render() {
			const { host, showFacil } = this.props;
			const url = `/hosts/${host.userUuid}`;
			let conversationName;
			if (host.conversation) conversationName = (host.conversation === true) ?
				'...' : host.conversation.name

			return (
				<li className="" key={host.uuid}>
					<Link className="list__item host-list-item" href={url}>
						<div className="list__item--title">
							{host.user.fullName}
							<div className="list__item--subtitle">
								{host.conversation ? conversationName : '(no conversation)'}
								{showFacil ? <div className="host-facil"> - {host.facilitator.preferredName}</div> : ''}
							</div>
						</div>
						<div className="host-status">{host.private.status}</div>
						<Button>contact</Button>
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
			const isTeam = this.isTeam();

			let { hosts } = this;
			if (this.state.filter) {
				hosts = this.hosts
					.filter(h => filterStatus.includes(get(h, 'private.status')))
					// Ensure visible hosts have conversation
					.forEach((host) => {
						if (!host.conversation) {
							const uuid = get(host, 'private.conversationUuid');
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
									.then((c) => { host.conversation = c; });
							}
						}
						if (isTeam && !host.facilitator) {
							// eslint-disable-next-line no-param-reassign
							host.facilitator = this.facilitators[host.private.facilitatorUuid];
						}
					});
			}

			this.setState({ hosts, loading: false });
		}

		async getUserUuids() {
			const currentUserUuid = get(this.props, 'global.user.uuid');
			let uuids = currentUserUuid;

			if (this.isTeam()) {
				const facilitators = await getData(api.users.getAll({
					query: {
						'private.teamLeaderUuid': currentUserUuid,
					},
				}));
				uuids = facilitators
					.map((f) => {
						// Save the facilitator in the uuid map
						this.facilitators[f.uuid] = f;
						// Map it to it's uuid to create the query param
						return f.uuid;
					})
					.join(',');
			}

			return uuids;
		}

		isTeam = () => {
			const { show } = this.props.getValues();
			return show === 'team';
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

				await Promise.all(this.hosts.map(async (host) => {
					if (!host.user) {
						// eslint-disable-next-line no-param-reassign
						host.user = await getData(api.users.get({ id: host.userUuid }));
					}
				}));
			} catch (error) {
				this.setState({ error, loading: false });
			}

			this.setHosts();
		}

		toggleFilter = () => {
			// If we're about to switch to filtered
			this.setState({	filter: !this.state.filter }, this.setHosts);
		}

		render() {
			const now = dayjs();
			const { hosts, filter, loading, error } = this.state;

			if (loading) return <Spinner />;

			const isTeam = this.isTeam();

			return (
				<div className="host-list__wrapper list__wrapper">
					{error ? (
						<div className="error">{error.message}</div>
					) : ''}
					{this.hosts.length ? (
						<Button className="list__toggle" onClick={this.toggleFilter}>
							{filter ? 'Show All' : 'Hide Complete' }
						</Button>
					) : ''}
					{this.hosts.length ? (
						<ul className="host-list">
							{hosts.map(host => (
								<Host
									{...this.props}
									now={now}
									showFacil={isTeam}
									host={host} />
							))}
						</ul>
					) : (
						<p>You have no {this.hosts.length ? 'unbooked' : ''} hosts</p>
					)}
				</div>
			);
		}
	};
};
