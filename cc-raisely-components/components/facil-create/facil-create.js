(RaiselyComponents, React) => {
	const { ProfilePreviewByUuid, ProfileSelect } = RaiselyComponents.Molecules;
	const { Button } = RaiselyComponents.Atoms;
	const { api, Spinner } = RaiselyComponents;
	const { getData } = api;

	const UserSelect = RaiselyComponents.import('user-select-wrapper');
	const ReturnButton = RaiselyComponents.import('return-button');
	const UserSaveHelperRef = RaiselyComponents.import('cc-user-save', { asRaw: true });
	const FacilitatorRef = RaiselyComponents.import('facilitator', { asRaw: true });
	let Facilitator;
	let UserSaveHelper;

	return class FacilCreate extends React.Component {
		state = { step: 1 }
		async save() {
			try {
				const { team, user } = this.state;

				this.setState({ saving: true });
				if (!UserSaveHelper) UserSaveHelper = UserSaveHelperRef().html;
				await UserSaveHelper.setupVolunteer({
						type: 'facilitator',
						userUuid: user.uuid,
						teamUuid: team.uuid,
				});
				this.setState({ saving: false });
			} catch (e) {
				console.error(e);
				this.setState({ error: e.message || 'An unknown error occurred', saving: false });
			}
		}

		reset = () => {
			this.setState({
				step: 1,
				user: null,
				existingTeam: null,
			});
		}

		async loadExistingTeam() {
			try {
				const { user, team } = this.state;
				this.setState({ loadingExistingTeam: true })
				if (!Facilitator) Facilitator = FacilitatorRef().html;
				const promises = [Facilitator.getFacilitatorTeam(user.uuid)];
				if (team && !team.name) {
					promises.push(getData(api.profiles.get({ id: team.uuid })));
				}
				const [existingTeam, selectedTeam] = await Promise.all(promises);
				const newState = { existingTeam, loadingExistingTeam: false };
				if (selectedTeam) newState.team = selectedTeam;
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
			if ((direction === 1) && (step === 1)) {
				this.loadExistingTeam();
			}
			if ((direction === 1) && step === 2) {
				this.save();
			}
			this.setState({ step: step + direction });
		}

		updateUser = ({ user }) => {
			this.setState({ user });
		}
		updateTeam = (value) => {
			const team = value && value.team;
			this.setState({ team });
		}

		selectPage() {
			const { global } = this.props;
			const { user, team } = this.state;

			return (
				<div className="facil-create__select-user">
					<UserSelect
						global={global}
						user={user}
						label="Facilitator"
						updateUser={this.updateUser} />

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

								update={value => {
									this.setState({ team: { uuid: value } })
								}}

								type="GROUP"
							/>
						)}
					</div>
				</div>
			);
		}

		verifyTeamPage() {
			const { existingTeam, loadingExistingTeam, user, team } = this.state;
			const name = user.fullName || user.preferredName;

			if (loadingExistingTeam) {
				return (
					<div className="facil-create__loading">
						<p>Checking the current status of {name}</p>
						<Spinner />
					</div>
				);
			}

			if (existingTeam && existingTeam.uuid !== team.uuid) {
				return (
					<div className="facil-create__facil-exists">
						<p>{name} is already a facilitator and member of {existingTeam.name}</p>
						<p>Click next to move them to {team.name}</p>
					</div>
				);
			}

			if (existingTeam && existingTeam.uuid === team.uuid) {
				return (
					<div className="facil-create__facil-exists">
						<p>{name} is already a facilitator and member of {team.name}</p>
						<p>You {"shouldn't"} need to do anything, but you can click next to verify that all their permissions are correct</p>
					</div>
				);
			}

			return (
				<div className="facil-create__facil-exists">
					<p>{name} is currently not a facilitator</p>
					<p>Click next to make them a facilitator and add them to {team.name}</p>
				</div>
			);
		}

		savePage() {
			const { saving } = this.state;
			if (saving) {
				return (
					<div className="facil-create__saving">
						<p>Setting up the facilitator</p>
						<Spinner />
					</div>
				);
			}
			return (
				<div className="facil-create__saving">
					<Button onClick={this.reset}>Add/update another</Button>
					<ReturnButton backLabel="Back to Dashboard" />
				</div>
			)
		}

		buttons() {
			const { loadingExistingTeam } = this.state;

			return (
				<div className="buttons facil-create__buttons">
					<Button onClick={() => this.nextStep(-1)} theme="secondary">Back</Button>
					<Button disabled={loadingExistingTeam} onClick={() => this.nextStep()} theme="primary">Next</Button>
				</div>
			);
		}

		render() {
			const { step, error } = this.state;
			const pages = ['selectPage', 'verifyTeamPage', 'savePage'];
			const page = pages[step - 1];

			console.log('next page', step, page, this[page])

			if (error) {
				return (
					<div className="facil-create__wrapper">
						<p className="error">{error}</p>
					</div>
				)
			}

			return (
				<div className="facil-create__wrapper">
					{this[page]()}
					{(page !== 'savePage') && this.buttons()}
				</div>
			);
		}
	}
}
