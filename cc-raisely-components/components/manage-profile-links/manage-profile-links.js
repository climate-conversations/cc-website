(RaiselyComponents, React) => {
	const { api } = RaiselyComponents;
	const { getData } = api;
	const { Button } = RaiselyComponents.Atoms;
	const { get } = RaiselyComponents.Common;
	const FacilitatorRef = RaiselyComponents.import('facilitator', { asRaw: true });
	let Facilitator

	return class ManageProfileLinks extends React.Component {
		state = {};
		componentDidMount() {
			this.load();
		}

		async load() {
			try {
				if (!Facilitator) Facilitator = FacilitatorRef().html;
				const [teams, profile, authenticate] = await Promise.all([
					Facilitator.getTeams(),
					Facilitator.getFacilitatorProfile(this.props),
					getData(api.users.authenticate())
				]);
				console.log('Authenticate', authenticate);
				const isAdmin = get(authenticate, 'roles', []).includes('ORG_ADMIN');
				this.setState({ profile, teams });
			} catch (e) {
				this.setState({ error: e.message || 'Failed to load' });
			}
		}

		renderTeam(teams) {
			return (
				<div className="col col--4 manage-profile-block">
					<h3><span>Manage your Team</span></h3>
					<p>Get an overview of where your team is at and how you can help them.</p>
					{teams.map(team => (
						<Button key={team.uuid} href={`/t/${team.path}`}>{team.name} Dashboard</Button>
					))}
				</div>
			);
		}

		renderFacil(profile) {
			const link = `/${profile.path}`;
			return (
				<div className="col col--4 manage-profile-block">
					<h3>Your Dashboard</h3>
					<p>Manage conversations that you will or have facilitated and your prospective hosts.</p>
					<Button href={link}>Your Dashboard</Button>
				</div>
			);
		}

		renderAdmin() {
			return (
				<div className="col col--4 manage-profile-block">
					<h3>Program Coordinator Tools</h3>
					<p>Manage teams, and communications templates.</p>
					<Button href="/dashboards/admin">Administrator Tools</Button>
				</div>
			);
		}

		render() {
			const { error, profile, teams } = this.state;
			// FIXME set this once we've resolved facil and team leader permissions
			const isAdmin = false;
			return (
				<div className="row__container manage-profile-wrapper">
					{profile ? this.renderFacil(profile) : ''}
					{teams && teams.length ? this.renderTeam(teams) : ''}
					{isAdmin && this.renderAdmin() }
					{error && (
						<div className="error">
							<p>There was an error loading your profiles:</p>
							<p>{error}</p>
						</div>
					)}
				</div>
			)
		}
	};
};
