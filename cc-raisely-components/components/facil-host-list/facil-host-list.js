/**
 * Component for displaying hosts, used in facil, team leader and coordinator dashboards
 * Filters:
 * * Unassigned (without a host interest interaction)
 * * Incomplete
 * * Abandoned
 * Scopes
 * * Facilitator
 * * Team
 * * All
 */
(RaiselyComponents, React) => {
	const { Icon, Button } = RaiselyComponents.Atoms;
	const { get, dayjs } = RaiselyComponents.Common;
	const { api, Spinner, Link } = RaiselyComponents;
	const { getData } = api;

	const RaiselyButton = RaiselyComponents.import('raisely-button');
	const FacilitatorRef = RaiselyComponents.import('facilitator', { asRaw: true });
	const UserHelperRef = RaiselyComponents.import('cc-user-save', { asRaw: true });
	let UserHelper;
	let Facilitator;

	const icons = {
		public: 'public',
		private: 'supervised_user',
		corporate: 'accessibility_new',
	};

	function formatDate(host, field) {
		const value = get(host, field);
		if (!value) return 'N/A';
		return dayjs(value).format('DD/MM/YYYY');
	}

	const promiseCache = {};

	function cachedPromise(type, uuid, fn) {
		if (!promiseCache[type]) promiseCache[type] = {};
		if (!promiseCache[type][uuid]) promiseCache[type][uuid] = fn();
		return promiseCache[type][uuid];
	}

	class Host extends React.Component {
		componentDidMount() {
		}

		render() {
			const { host, showFacil, mode } = this.props;
			const url = `/hosts/${host.uuid}`;
			const conversationName = (host.conversation === true) ?
				'...' : get(host.conversation, 'name', '...');

			const name = get(host, 'user.fullName') ||
				get(host, 'user.preferredName') ||
				get(host, 'user.email') ||
				'...';

			const facilName = get(host, 'facilitator.preferredName') ||
				get(host, 'faciltiator.fullName') ||
				"(unknown facil)";

			return (
				<li className="" key={host.uuid}>
					<Link className="list__item host-list-item" href={url}>
						<div className="list__item--title">
							{name}
							<div className="list__item--subtitle">
								{host.conversation ? conversationName : '(no conversation)'}
								{showFacil && mode !== 'full' ? <div className="host-facil"> - {facilName}</div> : ''}
							</div>
						</div>
						{mode === 'full' ? (
							<React.Fragment>
								<div className="first-contact list__item--small">
									{host.facilitatorUUid ? facilName : '(unassigned)'}
								</div>
								<div className="first-contact list__item--small">
									{formatDate(host, 'detail.private.firstContactedAt')}
								</div>
								<div className="last-contact list__item--small">
									{formatDate(host, 'detail.private.lastContactedAt')}
								</div>
								<div className="first-hosted list__item--small">
									{formatDate(host, 'detail.private.firstHostedAt')}
								</div>
							</React.Fragment>
						) : ''}
						<div className="host-status list__item--small">{get(host, 'detail.private.status', 'lead')}</div>
						<div className="host-list-item__buttons">
							<Button>contact</Button>
							<RaiselyButton recordType="user" uuid={host.userUuid} />
						</div>
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
		componentDidUpdate() {
			if (!Facilitator) Facilitator = FacilitatorRef().html;
			const reloadKey = Facilitator.getTeamOrFacilUniqueKey(this.props);

			// Reload the conversation and guests if the id has changed
			if (reloadKey !== this.state.reloadKey) {
				console.log('Reloading', reloadKey, '!=', this.state.reloadKey)
				this.setState({ loading: true });
				this.load();
			}
		}

		setHosts = () => {
			if (!Facilitator) Facilitator = FacilitatorRef().html;
			const reloadKey = Facilitator.getTeamOrFacilUniqueKey(this.props);
			this.setState({ reloadKey });

			const hostStatus = ['lead', 'interested', 'booked', 'hosted', 'not interested'];
			const { mode } = this.props.getValues;
			const filterStatus = ['lead', 'interested', 'booked'];
			const isTeam = Facilitator.isTeamMode(this.props) || (mode === 'full');

			let { hosts } = this;
			if (this.state.filter) {
				const filter = mode === 'full' ?
					(h => !get(h, 'detail.private.facilitatorUuid')) :
					(h => filterStatus.includes(get(h, 'detail.private.status')));
				hosts = hosts
					.filter(filter)
			}
			if (!UserHelper) UserHelper = UserHelperRef().html;
			hosts.forEach((host) => {
				// Ensure visible hosts have conversation
				if (!host.conversation) {
					const uuid = get(host, 'detail.private.conversationUuid');
					if (uuid) {
						host.conversation = true;
						// Multiple hosts may come from the same conversation
						// so cache the promise to retrieve so we only fetch it
						// once, and add a then callback to the promise for each host
						const makePromise = () => UserHelper.proxy(`/events/${uuid}`)
								.catch(e => this.setState({ error: e }));
						cachedPromise('conversation', uuid, makePromise)
							.then((c) => {
								host.conversation = c;
								this.setState({ hosts });
							});
					}
				}
				if (isTeam && !host.facilitator) {
					const facilUuid = get(host, 'detail.private.facilitatorUuid');
					host.facilitator = this.facilitators[facilUuid];
					if (!host.facilitator && facilUuid) {
						host.facilitator = true;
						const makePromise = () => UserHelper.proxy(`/events/${facilUuid}`)
							.then(facilitator => this.facilitators[facilUuid] = facilitator);
						cachedPromise('faciltiator', facilUuid, makePromise)
							.then(host.facilitator = this.facilitators[facilUuid]);
					}
				}
			});

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
				});
			return JSON.stringify(uuids);
		}

		getMode() {
			const { show } = this.props.getValues();
			return show;
		}

		mock() {
			return [{
				status: 'lead',
				user: { fullName: 'Louise Straw' },
				conversation: { name: "George's Conversation" },
			}, {
				user: { preferredName: 'Kim' },
				facilitator: { fullName: 'James' },
				detail: {
					private: {
						status: 'booked',
						firstContactedAt: '2019-11-05 12:45:00Z',
						facilitatorUuid: 'present',
					}
				}
			}, {
				user: { preferredName: 'Alex' },
				detail: {
					private: {
						status: 'hosted',
						firstContactedAt: '2019-11-05 12:45:00Z',
						lastContactedAt: '2019-11-09 12:45:00Z',
						firstHostedAt: '2019-11-06 12:45:00Z',
					}
				}
			}];
		}

		async loadAll() {
			const [intention] = await Promise.all([
				getData(api.interactions.getAll({
					query: {
						private: 1,
						category: 'host-interest',
						join: 'user',
					},
				})),
				// FIXME need to use an advanced segment to fetch
				// hosts without host-interest interactions
				// getData(api.users.getAll({
				// 	query: {
				// 		private: 1,
				// 		host: true,
				// 	},
				// })),
			]);
			return intention;
		}

		async load() {
			const mode = this.getMode();
			const { mock } = this.props.global.campaign;
			try {
				if (!Facilitator) Facilitator = FacilitatorRef().html;
				const reloadKey = Facilitator.getTeamOrFacilUniqueKey(this.props);
				this.setState({ reloadKey });

				if (mock) {
					this.hosts = this.mock();
				} else if (mode === 'full') {
					this.hosts = await this.loadAll();
				} else {
					if (!get(this.props, 'global.current.profile.uuid')) return;

					const userUuid = await this.getUserUuids();
					console.log('get hosts for facils: ', userUuid)
					this.hosts = await getData(api.interactions.getAll({
						query: {
							private: 1,
							category: 'host-interest',
							'detail.facilitatorUuidIn': userUuid,
						},
					}));
				}

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

		listHeader() {
			return (
				<li className="" key="header">
					<div className="list__item host-list-item host-list-header">
						<div className="list__item--title">
							Host Name
							<div className="list__item--subtitle">
								(Conversation recruited at)
							</div>
						</div>
						<div className="facilitator list__item--small">
							Assigned To
						</div>
						<div className="first-contact list__item--small">
							First Contacted
						</div>
						<div className="last-contact list__item--small">
							Last Contacted
						</div>
						<div className="first-hosted list__item--small">
							First Hosted
						</div>
						<div className="host-status list__item--small">Status</div>
						<div className="host-list-item__buttons"></div>
					</div>
				</li>
			);
		}

		render() {
			const now = dayjs();
			const { filter, loading, error } = this.state;
			const mode = this.getMode();

			if (loading) return <Spinner />;

			if (!Facilitator) Facilitator = FacilitatorRef().html;
			const isTeam = Facilitator.isTeamMode(this.props);

			const hideText = (mode === 'full') ? 'Hide Assigned' : 'Hide Complete';

			return (
				<div className="host-list__wrapper list__wrapper">
					{error ? (
						<div className="error">{error.message}</div>
					) : (
						<React.Fragment>
							{this.hosts.length ? (
								<Button className="list__toggle" onClick={this.toggleFilter}>
									{filter ? 'Show All' : hideText }
								</Button>
							) : ''}
							{this.hosts.length ? (
								<ul className="host-list">
									{mode === 'full' ? this.listHeader() :''}
									{this.hosts.map(host => (
										<Host
											key={host.uuid}
											{...this.props}
											now={now}
											mode={mode}
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
