(RaiselyComponents, React) => {
	const { api, Common, Spinner } = RaiselyComponents;
	const { get } = Common;
	const UserSaveHelperRef = RaiselyComponents.import('cc-user-save');
	const WhatsAppButton = RaiselyComponents.import('whatsapp-button');
	let UserSaveHelper;

	return class TeamContact extends React.Component {
		state = { loading: true };
		async load() {
			try {
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
				this.setState({ error: e.message, loading: false });
			}
		}

		nouns(facilitator) {
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

		renderForTeam() {
			const { teamProfile } = this.state;
			return (
				<div className="team-membership-details">
					<div className="team-membership__team">
						<WhatsAppButton
							label="Open Group Chat"
							link={get(teamProfile.private.teamChatUrl)}
						/>
						Note: This will add you to the group chat if you are not already a member
					</div>
				</div>
			);
		}
		mode() {
			const { show } = this.props.getValues();
			return show;
		}

		render() {
			const { teamProfile, facilitator, teamLeader, loading } = this.state;
			if (loading) return <Spinner />
			if (this.mode() === 'team') return this.renderForTeam();

			const { you, your } = this.nouns(facilitator);
			const leaderName = get(teamLeader, 'preferredName') || get(teamLeader, 'fullName');
			return (
				<div className="team-membership-details">
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
				</div>
			);
		}
	};
};
