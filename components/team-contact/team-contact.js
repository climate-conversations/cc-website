(RaiselyComponents) => {
	const { api, Common, Spinner } = RaiselyComponents;
	const { get } = Common;
	const UserSaveHelperRef = RaiselyComponents.import('cc-user-save', { asRaw: true });
	const WhatsAppButton = RaiselyComponents.import('whatsapp-button');
	let UserSaveHelper;

	class TeamContact extends React.Component {
		state = { loading: true };
		componentDidMount() {
			console.log('loading')
			this.load();
		}
		componentDidUpdate() {
			const profileUuid = get(this.props, 'global.current.profile.uuid') || get(this.props, 'match.params.profile');
			const hasChanged = (profileUuid !== this.state.profileUuid) ||
				(this.state.mode !== this.mode());
			if (hasChanged) {
				this.load();
			}
		}
		load = async () => {
			try {
				const profileUuid = get(this.props, 'global.current.profile.uuid') || get(this.props, 'match.params.profile');
				this.setState({ profileUuid, mode: this.mode() });
				const { profile } = await api.quickLoad({ props: this.props, models: ['profile.private'], required: true });

				if (profile.type === 'GROUP') {
					this.setState({ teamProfile: profile });
				}

				this.setState({ profile, facilitator: profile.user });
				if (!UserSaveHelper) UserSaveHelper = UserSaveHelperRef().html;
				const { teamProfile } = await UserSaveHelper.proxy(`/profiles/${profile.parentUuid}?private=1`, {
					method: 'get',
				});
				this.setState({ teamProfile, teamLeader: teamProfile.user });
			} catch (e) {
				console.error(e);
				this.setState({ error: e.message || 'Could not load team', loading: false });
			}
		}

		nouns = (facilitator) => {
			const currentUuid = get(this.props, 'current.user.uuid', 'logged-out');
			if (currentUuid === get(facilitator, 'uuid', 'n/a')) {
				return {
					you: 'You',
					your: 'Your',
				}
			}
			const noun = get(facilitator, 'preferredName') || get(facilitator, 'fullName');
			return {
				you: noun,
				your: `${noun}'s`,
			};
		}

		renderTeam = () => {
			const { teamProfile } = this.state;
			return (
				<div className="team-membership-details">
					<div className="team-membership__team">
						<WhatsAppButton
							label="Open Group Chat"
							link={get(teamProfile.private.teamChatUrl)}
						/>
						(Note: This will add you to the group chat if you are not already a member)
					</div>
				</div>
			);
		}
		renderFacil = () => {
			const { teamProfile, facilitator, teamLeader } = this.state;
			const { you, your } = this.nouns(facilitator);
			const leaderName = get(teamLeader, 'preferredName') || get(teamLeader, 'fullName');

			return (
				<React.Fragment>
					<div className="team-membership__team">
						<span className="team-membership__team-name">{you} are part of</span>
						<h4>{teamProfile.name}</h4>
						<WhatsAppButton
							label="Open Group Chat"
							link={get(teamProfile.private.teamChatUrl)}
						/>
					</div>
					{your} team leader is {leaderName}
					<div className="team-membership__leader-contact">
						<Icon
						/>
						<WhatsAppButton
							phone={get(teamLeader, 'phoneNumber')}
						/>
					</div>
				</React.Fragment>
			);
		}
		mode = () => {
			const { show } = this.props.getValues();
			return show;
		}

		render() {
			const { loading, error } = this.state;
			if (loading) return <Spinner />

			return (
				<div className="team-membership-details">
					{error ? (
						<div className="error">{error}</div>
					) : ((this.mode() === 'team') ? this.renderTeam() : this.renderFacil())}
				</div>
			);
		}
	};

	return TeamContact;
};
