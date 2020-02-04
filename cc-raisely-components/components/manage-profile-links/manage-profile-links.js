(RaiselyComponents, React) => {
	const { get } = RaiselyComponents.Common;
	const { api } = RaiselyComponents;
	const { Button } = RaiselyComponents.Atoms;
	const { getData } = api;
	return class ManageProfileLinks extends React.Component {
		state = {};
		componentDidMount() {
			this.load();
		}

		async load() {
			try {
				const teams = await getData(api.users.meWithProfiles({ type: 'GROUP' }));
				this.setState({ teams })
			} catch (e) {
				this.setState()
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

		render() {
			let profile = get(this.props, 'global.user.profile');
			// Raisely will assign the team profile if they don't have an individual one
			// remove it
			if (profile.type !== 'INDIVIDUAL') profile = null;
			const { teams } = this.state;
			return (
				<div className="row__container manage-profile-wrapper">
					{profile ? this.renderFacil(profile) : ''}
					{teams && teams.length ? this.renderTeam(teams) : ''}
				</div>
			)
		}
	};
};
