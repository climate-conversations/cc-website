(RaiselyComponents, React) => {
	const { ProfileSearch } = RaiselyComponents.Molecules;
	const { Button } = RaiselyComponents.Atoms;

	const UserSelect = RaiselyComponents.import('user-select-wrapper');
	const UserSaveHelperRef = RaiselyComponents.import('cc-user-save', { asRaw: true });
	const FacilitatorRef = RaiselyComponents.import('facilitator', { asRaw: true });
	let Facilitator;
	let UserSaveHelper;

	return class FacilCreate extends React.Component {
		state = { step: 1 }
		async save() {
			const { team, user } = this.state;

			if (!UserSaveHelper) UserSaveHelper = UserSaveHelperRef().html;
			await UserSaveHelper.setupVolunteer({
					type: 'facilitator',
					userUuid: user.uuid,
					teamUuid: team.uuid,
			});
		}

		async loadExistingTeam() {
			try {
				const { user } = this.state;
				this.setState({ loadingExistingTeam: true })
				if (!Facilitator) Facilitator = FacilitatorRef().html;
				const team = await Facilitator.getFacilitatorTeam(user.uuid);
				this.setState({ existingTeam: team, loadingExistingTeam: false })
			} catch (e) {
				console.log(e);
				this.setState({
					loadingExistingTeam: false,
					error: e.message || 'An unknown error occurred'
				});
			}
		}

		nextStep = (direction = 1) => {
			const { step } = this.state;
			if ((direction === 1) && (step === 2)) {
				this.loadExistingTeam();
			}
			this.setState({ step: step + direction });
		}

		updateUser = (user) => {
			this.setState({ user });
		}

		selectPage() {
			const { global } = this.props;
			const { user } = this.state;
			const { uuid: campaignUuid } = global.campaign;

			return (
				<div className="facil-create__select-user">
					<UserSelect
						global={global}
						user={user}
						label="Facilitator"
						updateUser={this.updateUser} />

					<ProfileSearch
						limit={10}
						type="GROUP"
						searchLabel="Team to add them to"
						campaignUuid={campaignUuid}
						hideInitialResults={false}
						user={global.user}
						mock={global.campaign && global.campaign.mock}
					/>
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

		buttons() {
			const { loadingExistingTeam } = this.state;

			return (
				<div className="buttons facil-create__buttons">
					<Button onClick={() => this.nextStep(-1)} theme="secondary">Back</Button>
					<Button disabled={loadingExistingTeam} onClick={this.nextStep} theme="primary">Next</Button>
				</div>
			);
		}

		render() {
			const { step } = this.state;
			const pages = ['selectPage', 'verifyTeamPage'];
			const page = pages[step - 1];

			return (
				<div className="facil-create__wrapper">
					{this[page]()}
					{this.buttons()}
				</div>
			);
		}
	}
}
