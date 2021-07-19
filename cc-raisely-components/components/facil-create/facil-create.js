(RaiselyComponents, React) => {
	const { ProfilePreviewByUuid, ProfileSelect } = RaiselyComponents.Molecules;
	const { Button, Input } = RaiselyComponents.Atoms;
	const { api, Spinner } = RaiselyComponents;
	const { getData } = api;
	const { get } = RaiselyComponents.Common;

	const UserSelect = RaiselyComponents.import('user-select-wrapper');
	const RaiselyButton = RaiselyComponents.import('raisely-button');
	const ReturnButton = RaiselyComponents.import('return-button');
	const UserSaveHelperRef = RaiselyComponents.import('cc-user-save', {
		asRaw: true,
	});
	const FacilitatorRef = RaiselyComponents.import('facilitator', {
		asRaw: true,
	});
	let Facilitator;
	let UserSaveHelper;

	return class FacilCreate extends React.Component {
		state = { step: 1, type: 'facilitator' };
		async save() {
			try {
				const { team, user } = this.state;

				this.setState({ saving: true });
				if (!UserSaveHelper) UserSaveHelper = UserSaveHelperRef().html;
				await UserSaveHelper.setupVolunteer({
					type: this.state.type,
					userUuid: user.uuid,
					teamUuid: team.uuid,
				});
				this.setState({ saving: false });
			} catch (e) {
				console.error(e);
				this.setState({
					error: e.message || 'An unknown error occurred',
					saving: false,
				});
			}
		}

		reset = () => {
			this.setState({
				step: 1,
				user: null,
				existingTeams: null,
				existingTeam: null,
				passwordReset: false,
			});
		};
		resetPassword = async () => {
			const { user } = this.state;
			try {
				if (!UserSaveHelper) UserSaveHelper = CCUserSaveRef().html;
				this.setState({ sendingEmail: true });
				await UserSaveHelper.sendPasswordReset(user.uuid);
				this.setState({ passwordReset: true, sendingEmail: false });
			} catch (error) {
				console.error(error);
				this.setState({ sendingEmail: false });
			}
		};

		async loadExistingTeam() {
			try {
				const { user, team } = this.state;
				let promises = [];
				this.setState({ loadingExistingTeam: true });

				const newState = {
					loadingExistingTeam: false,
				};

				// Check the existing team of the facilitator
				if (this.state.type === 'facilitator') {
					if (!Facilitator) Facilitator = FacilitatorRef().html;
					promises.push(
						Facilitator.getFacilitatorTeam(user.uuid).then(
							(team) => {
								newState.existingTeam = team;
							}
						)
					);
				} else {
					promises.push(
						getData(
							api.profiles.getAll({
								query: {
									campaign: get(
										this.props,
										'global.campaign.uuid'
									),
									user: user.uuid,
									private: 1,
									type: 'GROUP',
								},
							})
						).then((existingTeams) => {
							newState.existingTeams = existingTeams;
						})
					);
				}

				// Get full details of the team if we don't have them
				if (team && (!team.name || !team.user)) {
					promises.push(
						getData(
							api.profiles.get({
								id: team.uuid,
								query: {
									private: true,
								},
							})
						).then((team) => {
							newState.team = team;
						})
					);
				}

				await Promise.all(promises);

				this.setState(newState);
			} catch (e) {
				console.log(e);
				this.setState({
					loadingExistingTeam: false,
					error: e.message || 'An unknown error occurred',
				});
			}
		}

		nextStep = (direction = 1) => {
			const { step } = this.state;
			if (direction === 1 && step === 1) {
				this.loadExistingTeam();
			}
			if (direction === 1 && step === 2) {
				this.save();
			}
			this.setState({ step: step + direction });
		};

		updateUser = ({ user }) => {
			this.setState({ user });
		};
		updateTeam = (value) => {
			const team = value && value.team;
			this.setState({ team });
		};

		selectPage() {
			const { global } = this.props;
			const { user, team } = this.state;

			return (
				<div className="facil-create__select-user">
					<UserSelect
						global={global}
						user={user}
						label="Facilitator"
						updateUser={this.updateUser}
					/>

					<div className="facil-create__profile-wrapper">
						{team && team.uuid ? (
							<ProfilePreviewByUuid
								api={api}
								heading="Add to team..."
								uuid={team.uuid}
								cancel={() => this.updateTeam(null)}
							/>
						) : (
							<ProfileSelect
								api={api}
								global={global}
								update={(value) => {
									this.setState({ team: { uuid: value } });
								}}
								type="GROUP"
							/>
						)}
					</div>

					<Input
						type="select"
						value={this.state.type}
						options={[
							{ value: 'facilitator', label: 'Facilitator' },
							{ value: 'team-leader', label: 'Team Leader' },
						]}
						required={false}
						label="Make them a ..."
						change={(x, value) => this.setState({ type: value })}
					/>

					<div className="facil-create__profile-wrapper">
						<p>
							If you {"can't"} find the facilitator, you may need
							to add them. Click <strong>Add Person</strong> below
							and then click on the New button at the top of the
							next page.
						</p>
						<RaiselyButton href="/people" label="Add Person" />
					</div>
				</div>
			);
		}

		verifyTeamPage() {
			const {
				existingTeam,
				existingTeams,
				loadingExistingTeam,
				user,
				team,
				type,
			} = this.state;
			const name = user.fullName || user.preferredName;

			if (loadingExistingTeam) {
				return (
					<div className="facil-create__loading">
						<p>Checking the current status of {name}</p>
						<Spinner />
					</div>
				);
			}

			if (type === 'team-leader') {
				const oldTeamLeaderName =
					team.user.fullName || team.user.preferredName;

				if (team.user.uuid === user.uuid) {
					return (
						<div className="facil-create__facil-exists">
							<p>
								{name} is already the leader of
								{team.name}
							</p>
							<p>
								You {"shouldn't"} need to do anything, but you
								can click next to verify that all their
								permissions are correct
							</p>
						</div>
					);
				}

				return (
					<div className="facil-create__facil-exists">
						<p>
							{team.name} is currently lead by {oldTeamLeaderName}
						</p>
						{existingTeams && existingTeams.length ? (
							<p>
								{name} is the leader of{' '}
								{existingTeams.map((t) => t.name).join(', ')}
								(and this will not be changed if you click next)
							</p>
						) : null}
						<p>
							Click next{' '}
							<strong>
								to make {name} the leader of {team.name}
							</strong>
						</p>
					</div>
				);
			}

			if (existingTeam && existingTeam.uuid !== team.uuid) {
				return (
					<div className="facil-create__facil-exists">
						<p>
							{name} is already a facilitator and member of{' '}
							{existingTeam.name}
						</p>
						<p>
							Click next to <strong>move them</strong> to{' '}
							{team.name}
						</p>
					</div>
				);
			}

			if (existingTeam && existingTeam.uuid === team.uuid) {
				return (
					<div className="facil-create__facil-exists">
						<p>
							{name} is already a facilitator and member of{' '}
							{team.name}
						</p>
						<p>
							You {"shouldn't"} need to do anything, but you can
							click next to verify that all their permissions are
							correct
						</p>
					</div>
				);
			}

			return (
				<div className="facil-create__facil-exists">
					<p>{name} is currently not a facilitator</p>
					<p>
						Click next to{' '}
						<strong>
							make {name} a facilitator and add them to{' '}
							{team.name}
						</strong>
					</p>
				</div>
			);
		}

		savePage() {
			const {
				user,
				type,
				saving,
				passwordReset,
				sendingEmail,
			} = this.state;
			const name = user.fullName || user.preferredName;

			const friendlyType =
				type === 'facilitator' ? 'facilitator' : 'team leader';

			if (saving) {
				return (
					<div className="facil-create__saving">
						<p>Setting up {friendlyType}</p>
						<Spinner />
					</div>
				);
			}
			return (
				<div className="facil-create__saving">
					<p>
						{name} successfully configured as {friendlyType}
					</p>

					<p>
						If they haven't logged in before, you might want to send
						them an email to prompt them to set a password.
					</p>

					<div className="facil-create__reset-password">
						{passwordReset ? (
							<p>
								{name} has been sent an email to help them setup
								their password.
							</p>
						) : sendingEmail ? (
							<Spinner />
						) : (
							<Button onClick={this.resetPassword}>
								Reset {name}
								{"'"}s password
							</Button>
						)}
					</div>
					<Button onClick={this.reset}>Add/update another</Button>
					<ReturnButton backLabel="Back to Dashboard" />
				</div>
			);
		}

		buttons() {
			const { loadingExistingTeam } = this.state;

			return (
				<div className="buttons facil-create__buttons">
					<Button onClick={() => this.nextStep(-1)} theme="secondary">
						Back
					</Button>
					<Button
						disabled={loadingExistingTeam}
						onClick={() => this.nextStep()}
						theme="cta"
					>
						Next
					</Button>
				</div>
			);
		}

		render() {
			const { step, error } = this.state;
			const pages = ['selectPage', 'verifyTeamPage', 'savePage'];
			const page = pages[step - 1];

			if (error) {
				return (
					<div className="facil-create__wrapper">
						<p className="error">{error}</p>
					</div>
				);
			}

			return (
				<div className="facil-create__wrapper">
					{this[page]()}
					{page !== 'savePage' && this.buttons()}
				</div>
			);
		}
	};
};
