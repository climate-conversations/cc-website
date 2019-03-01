// TODO: cleanup and better inline documentation

// eslint-disable-next-line no-unused-expressions
(RaiselyComponents, React) => {
	const { api, Form, Spinner } = RaiselyComponents;
	const { Button, Icon } = RaiselyComponents.Atoms;
	const { findMostRelevantProfile } = RaiselyComponents.Common;
	const { CustomFieldsProvider } = RaiselyComponents.Modules;
	const {
		MultiForm,
		DonationForm,
		ProfilePreviewByUuid,
		ProfileSelect,
	} = RaiselyComponents.Molecules;

	// define inline configuration
	const config = {
		enableTeams: true,
		enableFacebook: true,
		accountTitle: 'Switch On!',
		challengeTitle: 'Your Challenge',
		profileTitle: 'Your Fundraising Page',
		teamTitle: 'Your Team Page',
		paymentDonationTitle: 'Kickstart your Fundraising',
		paymentRegistrationTitle: 'Pay the Registration Fee',
		accountButton: 'Switch On!',
		profileButton: 'Continue',
		teamButton: 'Continue',
		paymentButton: 'Complete my Registration',
		feeType: 'Donation',
	};

	class FacebookLogin extends React.Component {
		facebookLogin = (e) => {
			e.preventDefault();
			const { fbSDK } = this.props;

			fbSDK.login((response) => {
				if (response.authResponse) {
					fbSDK.api('/me', function me(r) {
						const {
							// eslint-disable-next-line camelcase
							first_name, last_name, email, id,
						} = r;
						this.props.next({
							// eslint-disable-next-line camelcase
							firstName: first_name, lastName: last_name, email, facebookId: id,
						});
					});
				} else {
					console.log('User cancelled login or did not fully authorize.');
				}
			}, { scope: 'email' });
		}

		render() {
			const { fbSDK } = this.props;

			return (
				<div className="signup-form__facebook" disabled={!fbSDK}>
					<Button className="button--facebook" onClick={this.facebookLogin}>
						<Icon name="facebook" theme="inverted" /> Sign up with Facebook
					</Button>
					<p>or use an email and password</p>
				</div>
			);
		}
	}

	class UserForm extends React.Component {
		state = {
			alreadyExists: false,
			email: '',
		};

		componentDidMount() {
			this.props.actions.loadIntegration('fbSDK', this.props.global);
		}

		checkIfProfileExists = async (email) => {
			const existsRes = await api.users.checkUser({
				email,
				campaignUuid: this.props.global.campaign.uuid,
			});

			return existsRes.body().data().data.status !== 'OK';
		}

		// eslint-disable-next-line class-methods-use-this
		generateProfile(user) {
			const name = `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim();
			const path = `${user.firstName || user.first_name || ''}-${user.lastName || user.last_name || ''}`
				.replace(/\s/g, '-')
				.toLowerCase();

			const dwellingSize = user.private ? user.private.dwellingSize : user.public.dwellingSize;
			const { monthlyKWH } = this.calculateImpact(this.props.global.campaign, dwellingSize, 1, 12);

			return {
				name,
				path,
				private: {
					dwellingSize,
					monthlyKWH,
				},
			};
		}

		next = async (user) => {
			const profileAlreadyExists = await this.checkIfProfileExists(user.email);

			if (profileAlreadyExists) {
				this.setState({ alreadyExists: true, email: user.email });
				return;
			}

			const nextStep = () => this.props.updateStep(this.props.step + 1);
			const profile = this.generateProfile(user);

			this.props.updateValues({ user, profile }, nextStep);
		}

		// eslint-disable-next-line class-methods-use-this
		calculateImpact(campaign, dwellingSize, pax, months) {
			const dwellings = campaign.public.householdAverages;
			const monthlyKWH = (dwellings[dwellingSize] || dwellings.hdb3) * pax;
			const totalKWH = monthlyKWH * months;

			const trees = campaign.public.comparisons.treeFieldsPerKWH * totalKWH;

			// FIXME calculate this
			const spMonthly = 50;
			const greenMonthlyMin = 48;
			const greenMonthlyMax = 49;

			return {
				monthlyKWH,
				trees,
				totalKWH,
				minSaving: (spMonthly - greenMonthlyMax) * months,
				maxSaving: (spMonthly - greenMonthlyMin) * months,
				maxNewBill: greenMonthlyMax * months,
			};
		}

		render() {
			const { global } = this.props;

			const { fbSDK } = this.props.integrations;

			if (this.state.alreadyExists) {
				return (
					<div className="signup-form__exists">
						<p><strong>It looks like {'you\'re'} already signed up with {this.state.email}.</strong>
							You can login to proceed, or go ahead and choose your green energy retailer.
						</p>
						<Button
							theme="primary"
							href="/retailers"
						>
							Choose Retailer
						</Button>
						<Button
							theme="primary"
							href="/login"
						>
							Log In
						</Button>
						<Button
							theme="primary"
							href="/reset"
						>
							Reset my Password
						</Button>
					</div>
				);
			}

			// Show only a subset of fields on the form
			const userFields = ['firstName', 'first_name', 'lastName', 'last_name', 'email', 'phoneNumber'];

			const dwellingField = this.props.global.campaign.config.customFields.profile.find(f => f.id === 'dwellingSize');

			function selectFields(fields) {
				return fields.filter(f => userFields.includes(f.id)).concat([dwellingField]);
			}

			const dwellingSize = 'hdb3';

			const {
				trees,
				minSaving,
				maxSaving,
				maxNewBill,
				totalKWH,
			} = this.calculateImpact(global.campaign, dwellingSize, 1, 12);

			return (
				<React.Fragment>
					<CustomFieldsProvider global={global} name="user">
						{fields => (
							<div className="signup-form__account">
								<h3 className="signup-form__account--heading">{config.accountTitle}</h3>
								{config.enableFacebook && global.campaign.config.site.facebook.active && (
									<FacebookLogin fbSDK={fbSDK} next={this.next} />
								)}
								<Form
									unlocked
									fields={selectFields(fields)}
									values={this.props.values.user}
									actionText={config.accountButton}
									action={this.next} />
							</div>
						)}
					</CustomFieldsProvider>
					<div className="goal-calculator">
						<p><strong>FIXME these numbers are placeholders</strong></p>
						<p>
							<span className="signup-icon">⚡</span>
							Swiching your electricity would add up to {totalKWH} kWh of electricity
							per year being purchased from green energy retailers.
						</p>
						<p>
							<span className="signup-icon">🌳</span>
							{"That's"} rougly the equivalent of planting {trees} football fields
							of rainforest.
						</p>
						<p>
							<span className="signup-icon">🙌</span>
							Based on the average electricity utility bill, you could
							save between ${minSaving} and ${maxSaving} per year on your bill*,
							and up to ${maxNewBill} per year would flow towards retailers that
							are investing in an energy system of the future.
						</p>
						<p className="fineprint">
							* This is not financial advice. Pricing may vary for different customers
							based on usage, and with changes to available plans and offers by retailers.
							You and your friends should check the costs of any choices before making a
							decision to switch.
						</p>
					</div>
				</React.Fragment>
			);

			// FIXME add calculator at the bottom
		}
	}

	class CompleteForm extends React.Component {
		constructor(props) {
			super(props);

			this.state = {
				loading: true,
				message: null,
			};

			this.submitData = this.submitData.bind(this);
		}

		componentDidMount() {
			this.submitData();
		}

		async submitData() {
			const {
				updateStep, step, updateValues, actions,
			} = this.props;

			try {
				const res = await api.campaigns.register({
					id: this.props.global.campaign.uuid,
					data: { data: this.props.values },
				});

				const { token, message } = res.body().data();
				console.log(message);

				// Log the user in
				if (token) {
					// log user in
					const user = await api.users.setTokenGetUser(token);

					// add user to global state
					actions.addUser(user.body().data().data);

					// get profiles
					const profiles = await api.users.meWithProfiles();

					// add profile to user
					actions.addUserProfile(findMostRelevantProfile(profiles
						.body().data().data, this.props.global.campaign.uuid));
				}

				// redirect to retailers page always (they don't have to be logged in to do this step)
				this.props.history.push('/retailers');
			} catch (e) {
				const next = () => updateStep(step - 1);
				updateValues({
					error: {
						message: (e.response && e.response.data) ?
							e.response.data.errors[0].message
							: 'We couldn\'t register you due to an unexpected error. Please try again.',
					},
				}, next);
			}
		}

		render() {
			if (this.state.loading) {
				return (
					<div className="signup-form__loading">
						<Spinner />
						<p>One moment...</p>
					</div>
				);
			}
			return (
				<div className="signup-form__complete">
					<p>{this.state.message}</p>
				</div>
			);
		}
	}

	/**
	 * Core Signup Form molecule
	 */
	return class SignupForm extends React.Component {
		constructor(props) {
			super(props);

			const initState = {
				user: {},
				profile: {
					goal: 1,
					currency: props.global.campaign.currency,
					// FIXME where do I fetch this from?
					parentUuid: null,
				},
				teamProfile: null,
				donation: null,
				settings: {
					searchGroup: false,
					feeFixed: 28,
					feePercent: 0.0385,
				},
				error: null,
			};

			const steps = this.buildSteps(initState);

			this.state = Object.assign(initState, { steps });
		}

		updateValues = (
			handleState, // handles state object or state update function
			afterUpdateCallback // callback after updated
		) => {
			console.log('Update called', handleState)

			// handle state update function
			if (typeof handleState === 'function') {
				return this.setState(handleState, afterUpdateCallback);
			}

			const { state: oldState } = this;

			// setState only updates the state keys it's presented, so only batch
			// changes that are passed through handleState
			const toUpdate = {};

			['user', 'profile', 'teamProfile', 'donation', 'settings', 'error'].forEach((updateKey) => {
				// only apply certain values to setState if they actually changes
				if (!handleState[updateKey]) return;

				// apply the updated values to the old one and append
				toUpdate[updateKey] = { ...oldState[updateKey], ...handleState[updateKey] };
			});

			return this.setState(toUpdate, afterUpdateCallback);
		}

		buildSteps = (initState) => {
			const steps = [UserForm];
			steps.push(CompleteForm);
			return steps;
		}

		render() {
			return (
				<MultiForm {...{
					name: 'signup-form',
					...this.props, // make global state accessable
					values: this.state, // add in form data
					updateValues: this.updateValues, // form data update function
					steps: this.state.steps, // each step's react component
					error: this.state.error,
				}} />
			);
		}
	};
};
