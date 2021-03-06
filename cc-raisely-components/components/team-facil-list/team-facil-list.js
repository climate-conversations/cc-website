(RaiselyComponents, React) => {
	const { Button, Icon } = RaiselyComponents.Atoms;
	const { get } = RaiselyComponents.Common;
	const { api, Link, Spinner } = RaiselyComponents;
	const { getData } = api;

	const WhatsappButton = RaiselyComponents.import('whatsapp-button');
	const RaiselyButton = RaiselyComponents.import('raisely-button');
	const CCUserSaveRef = RaiselyComponents.import('cc-user-save', {
		asRaw: true,
	});
	const FacilitatorRef = RaiselyComponents.import('facilitator', {
		asRaw: true,
	});
	let Facilitator;
	let CCUserSave;

	const ProfileImage = (props) => {
		const fallbackImage =
			'https://storage.googleapis.com/raisely-assets/default-profile.svg';
		const { profile } = props;
		const image = profile.photoUrl || fallbackImage;
		const style = { backgroundImage: `url(${image})` };
		return (
			<div className="profile-image">
				<div className="profile-image__photo" style={style} />
			</div>
		);
	};

	class Profile extends React.Component {
		state = {};
		sendPasswordReset = async () => {
			const { profile } = this.props;
			try {
				if (!CCUserSave) CCUserSave = CCUserSaveRef().html;
				this.setState({ sendingEmail: true });
				await CCUserSave.sendPasswordReset(profile.user.uuid);
				this.setState({ emailSent: true, sendingEmail: false });
			} catch (error) {
				console.error(error);
			}
		};

		buttons() {
			const { profile, props } = this.props;
			const { sendingEmail, emailSent } = this.state;
			const profileLink =
				profile.type === 'GROUP'
					? `/t/${profile.path}`
					: `/${profile.path}`;

			if (!profile.parentUuid) {
				return <div className="team-facil-list__buttons" />;
			}
			let icon = sendingEmail ? 'autorenew' : 'vpn_key';
			if (emailSent) icon = 'check';
			return (
				<div className="team-facil-list__buttons">
					{profile.type === 'GROUP' ? (
						<WhatsappButton
							url={profile.teamChatUrl}
							label="Group Chat"
						/>
					) : (
						''
					)}
					<span
						className="reset-password-button"
						size="small"
						disabled={sendingEmail}
						onClick={!sendingEmail && this.sendPasswordReset}
					>
						<Icon name={icon} size="small" />
					</span>
					<WhatsappButton phone={profile.user.phoneNumber} />
					<Button href={profileLink} label="View" />
					<RaiselyButton
						recordType="profile"
						uuid={profile.uuid}
						props={props}
					/>
				</div>
			);
		}

		render() {
			const { profile, selected, onClick } = this.props;
			const className = `list__item ${selected ? 'select' : ''}`;
			let teamName;
			if (profile.type === 'GROUP') {
				if (
					get(this.props, 'campaign.profile.uuid') ===
					profile.parentUuid
				) {
					teamName = '(unassigned)';
				} else {
					teamName = profile.parent.name;
				}
			}
			// FIXME indicate retired facils
			// Will need to fetch user record separately and check if it still includes the facilitator tag
			let status;
			// FIXME add latest conversation status (overdue conversation, conversation coming up, host follow up due)
			return (
				<li key={profile.uuid} className={className} onClick={onClick}>
					<div className="team-facil-list__photo">
						<ProfileImage profile={profile} />
					</div>
					<div className="team-facil-list__name">
						{profile.name}
						{teamName && (
							<div className="team-facil-list__leader">
								{profile.type === 'GROUP'
									? profile.user.preferredName
									: teamName}
							</div>
						)}
						{status && (
							<div className="team-facil-list__status">
								{status}
							</div>
						)}
					</div>
					<div className="team-facil-list__count">
						{profile.conversationCount || ''}
					</div>
					{this.buttons()}
				</li>
			);
		}
	}

	class List extends React.Component {
		state = { selectedTeams: [] };

		toggleTeam = (uuid) => {
			if (this.props.setSelectedTeams) {
				let { selectedTeams } = this.state;
				const index = selectedTeams.indexOf(uuid);
				if (index > -1) {
					selectedTeams.splice(index, 1);
				} else {
					selectedTeams = [uuid];
				}
				this.props.setSelectedTeams(selectedTeams);
				this.setState({ selectedTeams });
			}
		};

		render() {
			const { title, profiles, props } = this.props;
			const { selectedTeams } = this.state;
			return (
				<div className="team-facil-list__wrapper">
					<h4>{title}</h4>
					<ul className="team-facil-list__list">
						{profiles.map((profile) => (
							<Profile
								key={profile.uuid}
								{...this.props}
								onClick={() => this.toggleTeam(profile.uuid)}
								profile={profile}
								selected={selectedTeams.includes(profile.uuid)}
								props={props}
							/>
						))}
					</ul>
				</div>
			);
		}
	}

	return class TeamFacilList extends React.Component {
		state = { selectedTeams: [] };

		componentDidMount() {
			this.load();
		}
		componentDidUpdate() {
			const profileUuid = get(this.props, 'global.current.profile.uuid');
			const { display } = this.props.getValues();
			const hasChanged =
				profileUuid !== this.state.profileUuid ||
				this.state.display !== display;
			if (hasChanged) {
				this.load();
			}
		}

		setSelectedTeams = (selectedTeams) => {
			this.setState({ selectedTeams }, this.filterTeams);
		};

		async load() {
			try {
				const { campaign } = this.props.global;
				const values = this.props.getValues();
				this.setState({ display: values.display });

				const query = {
					private: 1,
					sort: 'name',
					order: 'ASC',
					limit: 1000,
					campaign: campaign.uuid,
				};

				if (values.display !== 'all') {
					const profileUuid = get(
						this.props,
						'global.current.profile.uuid'
					);
					this.setState({ profileUuid });
					let profile = get(this.props, 'global.current.profile');
					if (profile) {
						profile = profile.uuid;
					} else {
						profile = this.props.profileUuid;
					}
					if (!profile) {
						const error =
							'Unknown current profile, this component should be used on a page with a url that contains :profile, or set display to all';
						console.log(error);
						this.setState({ error });
					}

					query.parent = profile;
				}
				const profiles = await getData(api.profiles.getAll({ query }));
				this.setState({ profiles }, this.filterTeams);
				this.fetchConversationCount(profiles);
			} catch (error) {
				console.error(error);
				this.setState({
					error: error.message || 'An unknown error occurred',
				});
			}
		}

		async fetchConversationCount(profiles) {
			if (!Facilitator) Facilitator = FacilitatorRef().html;
			const campaignUuid = this.props.global.uuid;
			try {
				const allFacils = profiles.map((p) => p.user.uuid);
				const conversations = await Facilitator.loadConversations(
					campaignUuid,
					allFacils
				);

				const { teamProfileMap } = this.state;
				// Map from facilitator uuid to array of conversation uuids
				const facilConversations = {};
				conversations.map((c) => {
					const facilUuid = c.facilitator.uuid;
					if (!facilConversations[facilUuid])
						facilConversations[facilUuid] = [c.uuid];
					else facilConversations[facilUuid].push(c.uuid);
				});
				profiles.forEach((profile) => {
					if (profile.type === 'INDIVIDUAL') {
						profile.conversationCount = (
							facilConversations[profile.user.uuid] || []
						).length;
					} else if (teamProfileMap) {
						// Get array of all conversations by team members
						// if teams were loaded
						const conversationList = teamProfileMap[
							profile.uuid
						].reduce(
							(all, profile) =>
								all.concat(
									facilConversations[profile.user.uuid] || []
								),
							[]
						);
						// Convert to set to get unique elements in case two facils co-facilitated the
						// same conversation
						profile.conversationCount = new Set(
							conversationList
						).size;
					}
				});
				this.setState({ facilConversations });
			} catch (error) {
				console.error('Error loading conversation count', error);
			}
		}

		initTeams(profiles, unassignedUuid) {
			let teamProfiles = profiles.filter((p) => p.type === 'GROUP');
			if (profiles.find((p) => p.parentUuid === unassignedUuid)) {
				teamProfiles = [
					{ uuid: unassignedUuid, name: '(Unassigned Facilitators)' },
					...teamProfiles,
				];
			}
			// Create a map from team uuid to array of facilitator profiles
			const teamProfileMap = {};
			profiles
				.filter((p) => p.type === 'INDIVIDUAL')
				.forEach((p) => {
					if (!teamProfileMap[p.parentUuid])
						teamProfileMap[p.parentUuid] = [p];
					else teamProfileMap[p.parentUuid].push(p);
				});
			this.setState({ teamProfiles, teamProfileMap });
		}

		filterTeams = () => {
			const values = this.props.getValues();
			const unassignedUuid = get(
				this.props,
				'global.campaign.profile.uuid'
			);
			const { profiles, selectedTeams } = this.state;
			let memberProfiles;
			if (values.display === 'all') {
				const { teamProfiles } = this.state;
				if (!teamProfiles) this.initTeams(profiles, unassignedUuid);
				if (selectedTeams.length) {
					memberProfiles = profiles.filter(
						(p) =>
							selectedTeams.includes(p.parentUuid) &&
							// If they clicked on unassigned, only show individual profiles
							(p.parentUuid !== unassignedUuid ||
								p.type === 'INDIVIDUAL')
					);
				} else {
					memberProfiles = profiles.filter(
						(p) => p.type === 'INDIVIDUAL'
					);
				}
			} else {
				memberProfiles = profiles;
			}

			this.setState({ memberProfiles });
		};

		render() {
			const {
				error,
				selectedTeams,
				teamProfiles,
				memberProfiles,
			} = this.state;
			const { display } = this.props.getValues();
			if (error) return <div className="error">{error}</div>;
			if (!memberProfiles) return <Spinner />;

			const innerTitle = selectedTeams.length
				? `Team Members`
				: 'Facilitators';

			return (
				<div className="team-list__wrapper">
					{display === 'all' ? (
						<List
							props={this.props}
							title="Teams"
							profiles={teamProfiles}
							setSelectedTeams={this.setSelectedTeams}
						/>
					) : (
						''
					)}
					<List
						title={innerTitle}
						profiles={memberProfiles}
						props={this.props}
					/>
					<div className="team-list__help">
						{display === 'all' ? (
							<p>
								Click on a team to show only the facilitators in
								that team
							</p>
						) : (
							''
						)}
					</div>
				</div>
			);
		}
	};
};
