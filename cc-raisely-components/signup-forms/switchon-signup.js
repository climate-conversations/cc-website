// TODO: cleanup and better inline documentation

// eslint-disable-next-line no-unused-expressions
(RaiselyComponents, React) => {
	const { api, Form, Spinner } = RaiselyComponents;
	const { Button, Icon } = RaiselyComponents.Atoms;
	const { findMostRelevantProfile } = RaiselyComponents.Common;
	const { CustomFieldsProvider } = RaiselyComponents.Modules;
	const {
		MultiForm,
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

	// Show only a subset of fields on the form
	const allUserFields = ['firstName', 'first_name', 'lastName', 'last_name', 'email', 'phoneNumber', 'postcode'];
	const baseUserFields = ['firstName', 'first_name', 'lastName', 'last_name', 'email', 'phoneNumber'];

	const validSwitchTypes = ['self', 'friend'];

	/**
	  * Helper function to decode the uri query
	  */
	function getQuery() {
		let match;
		const pl = /\+/g; // Regex for replacing addition symbol with a space
		const search = /([^&=]+)=?([^&]*)/g;
		const decode = (s) => { return decodeURIComponent(s.replace(pl, ' ')); };
		const query = window.location.search.substring(1);

		const urlParams = {};

		// eslint-disable-next-line
		while (match = search.exec(query)) urlParams[decode(match[1])] = decode(match[2]);
		return urlParams;
	}

	// eslint-disable-next-line no-unused-vars
	function noop() {}

	function calculateImpact(campaign, dwellingSize, pax, months) {
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

	function formatNumbers(impacts) {
		const decimalPlaces = {
			trees: 0,
			minSaving: 0,
			maxSaving: 0,
			maxNewBill: 0,
			totalKWH: 0,
		};

		const result = {};
		Object.keys(impacts).forEach((key) => {
			result[key] = impacts[key].toLocaleString(undefined, {
				maximumFractionDigits: decimalPlaces[key] || 0,
			});
		});
		return result;
	}

	/**
	  * @Returns true if:
	  * Postcode is present and the first 2 digits are a number
	  * Todays date is before May 1st
	  * The postcode starts with 01 - 33
	  */
	function marketAvailable(postcode) {
		const allOpen = new Date('2019-05-01');
		const todaysDate = new Date();

		// Have they specified a postcode, and is it before the full market
		// is open. If so, check if their postcode is open
		if (postcode && (todaysDate < allOpen)) {
			const start = parseInt(postcode.substr(0, 2), 10);

			return (start && start > 33);
		}

		return true;
	}

	function ensureSet(profile, defaults) {
		['public', 'private'].forEach((scope) => {
			if (defaults[scope]) {
				Object.keys(defaults[scope]).forEach((key) => {
					// eslint-disable-next-line no-param-reassign
					if (!profile[scope][key]) profile[scope][key] = defaults[scope][key];
				});
			}
		});

		console.log('Finalised profile', profile)
	}

	/**
	  * Helper to select custo fields by id
	  */
	function selectFields(fields, fieldIds) {
		return fields.filter(f => fieldIds.includes(f.id));
	}

	class SwitchForm extends React.Component {
		nextStep = () => this.props.updateStep(this.props.step + 1);
		// eslint-disable-next-line no-use-before-define
		complete = () => this.props.updateStep(this.props.steps.indexOf(CompleteForm));

		changeFocus = (switchType) => {
			// eslint-disable-next-line no-use-before-define
			const nextStep = () => this.props.updateStep(this.props.steps.indexOf(ImpactForm));
			this.props.updateValues({ switchType }, nextStep);
		}

		switchFriend = () => {
			this.changeFocus('friend');
		}

		switchSelf = () => {
			this.changeFocus('self');
		}

		isSelf = () => this.props.values.switchType === 'self';
		isFriend = () => this.props.values.switchType !== 'self';
		loggedIn = () => !!this.props.global.user;
	}

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

	function ButtonBar(props) {
		// eslint-disable-next-line object-curly-newline
		const { values, switchFriend, switchSelf, global } = props;

		const selected = 'primary';
		const unselected = 'cta';

		return (
			<div className="button-bar">
				<Button
					theme={values.switchType === 'self' ? selected : unselected}
					onClick={switchSelf}
				>
					Switch Yourself
				</Button>
				<Button
					theme={values.switchType === 'self' ? unselected : selected}
					onClick={switchFriend}
				>
					Switch Friends
				</Button>
			</div>
		);
	}

	class ImpactForm extends SwitchForm {
		onChange = (profile) => {
			this.props.updateValues({ profile });
		}

		next = async () => {
			let { nextStep } = this;

			// If the user already exists, and we're switching friends
			// then there's nothing to see on the users form, so skip it
			if (this.loggedIn() && this.isFriend()) {
				nextStep = this.complete;
			}

			// NOTE: No need to set values as they will have been done above
			// by the onChange handler
			this.props.updateValues({}, nextStep);
		}

		render() {
			const { global, values } = this.props;
			const { campaign } = global;

			const dwellingSize = (this.isSelf() ? values.profile.private.dwellingSize :
				values.profile.private.friendDwellingSize) || 'hdb3';
			const people = this.isFriend() ? values.profile.public.switchOnGoal || 5 : 1;

			const {
				trees,
				minSaving,
				maxSaving,
				maxNewBill,
				totalKWH,
			} = formatNumbers(calculateImpact(global.campaign, dwellingSize, people, 12));

			let noun = 'your';
			let profileFields;

			if (this.isSelf()) {
				profileFields = ['dwellingSize', 'switchOnMessage'];
				noun = "your friend's";
			} else {
				profileFields = campaign.public.goalFields;
			}

			const hideChoice = values.profile.public.switchOnConfirmed;

			return (
				<React.Fragment>
					<h3 className="signup-form__account--heading">Look what you could do...</h3>
					{hideChoice ? '' : (
						<ButtonBar {...{
							...this.props,
							switchSelf: this.switchSelf,
							switchFriend: this.switchFriend,
						}} />
					)}
					<CustomFieldsProvider global={global} name="profile">
						{fields => (
							<div className="signup-form__account">
								<Form
									unlocked
									fields={selectFields(fields, profileFields)}
									values={values.profile}
									onChange={this.onChange}
									buttons={noop}
								/>
							</div>
						)}
					</CustomFieldsProvider>
					<div className="goal-calculator">
						<p>
							<span className="signup-icon" role="img" aria-hidden="true">⚡</span>
							Swiching {noun} electricity would add up to <span className="impact">{totalKWH}</span> kWh of electricity
							per year being purchased from green energy retailers.
						</p>
						<p>
							<span className="signup-icon" role="img" aria-hidden="true">🌳</span>
							{"That's"} rougly the equivalent of preserving <span className="impact">{trees}</span> football fields
							of forest.
						</p>
						{this.isSelf() && false ? (
							<p>
								<span className="signup-icon" role="img" aria-hidden="true">🙌</span>
								Based on the average electricity utility bill, you could
								save between ${minSaving} and ${maxSaving} per year on your bill*,
								and up to $<span className="impact">{maxNewBill}</span> per year would flow towards retailers that
								are investing in an energy system of the future.
							</p>
						) : ''}
					</div>
					<Button
						onClick={this.next}>
						Next &gt;
					</Button>
					<div>
						<p className="fineprint">
							* This is not financial advice. Pricing may vary for different customers
							based on usage, and with changes to available plans and offers by retailers.
							You and your friends should check the costs of any choices before making a
							decision to switch.
						</p>
					</div>
				</React.Fragment>
			);
		}
	}

	class UserForm extends SwitchForm {
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

		next = async (user) => {
			const profileAlreadyExists = await this.checkIfProfileExists(user.email);

			if (profileAlreadyExists) {
				// If they've already registered, then we have their details and
				// can safely redirect to /retailers
				if (this.isSelf()) {
					this.props.history.push('/retailers');
				} else {
					// Otherwise prompt them to login to go to their dashboard
					this.setState({ alreadyExists: true, email: user.email });
				}

				return;
			}

			this.props.updateValues({ user }, this.nextStep);
		}

		render() {
			const { global, values } = this.props;

			const { fbSDK } = this.props.integrations;

			if (this.state.alreadyExists) {
				return (
					<div className="signup-form__exists">
						<p><strong>It looks like {'you\'re'} already registered with us with {this.state.email}.</strong></p>
						<p>
							You need to login to go to your dashboard and set a goal.
						</p>
						<p>
							<Button
								theme="cta"
								href="/login"
							>
								Log In
							</Button>
							<Button
								theme="cta"
								href="/reset"
							>
								Reset my Password
							</Button>
						</p>
					</div>
				);
			}

			let userFields = this.isSelf() ? allUserFields : baseUserFields;
			if (this.loggedIn()) userFields = ['postcode'];

			const goal = values.profile.public.switchOnGoal;

			return (
				<React.Fragment>
					<CustomFieldsProvider global={global} name="user">
						{fields => (
							<div className="signup-form__account">
								<h3 className="signup-form__account--heading">{config.accountTitle}</h3>
								<div className="signup-description">
									<p>
										Great! {"Let's"} create your profile.
									</p>
									{this.isSelf() ? (
										<p>
											Your profile will inspire other people to take the
											same action for our future.
										</p>
									) : (
										<p>
											Your profile is where {"you'll"} direct your friends
											to help you reach your goal of switching {goal}
											people over and will have links to help them (and
											you).
										</p>
									)}
									{(!this.loggedIn()) && config.enableFacebook &&
										global.campaign.config.site.facebook.active && (
										<FacebookLogin fbSDK={fbSDK} next={this.next} />
									)}
									{this.loggedIn() && (
										<p>
											Almost there! If you provide your postcode, we can check
											if green energy is available in your area (optional)
										</p>
									)}
								</div>
								<Form
									unlocked
									fields={selectFields(fields, userFields)}
									values={this.props.values.user}
									actionText={config.accountButton}
									action={this.next} />
							</div>
						)}
					</CustomFieldsProvider>
				</React.Fragment>
			);
		}
	}

	class OpenMarketNotAvailable extends SwitchForm {
		render() {
			return (
				<React.Fragment>
					<p>Sorry, your area cannot switch to green energy <em>yet</em>.</p>
					<p>Your area will be available from 1st May 2019.</p>
					<p>{'We\'ll'} send you an email to remind you when you can switch.</p>
					<p>
						{'Don\'t'} despair though! You can still make a big impact by switching your
						friends over now...
					</p>
					<Button
						onClick={this.switchFriend}
					>
						Switch friends
					</Button>
				</React.Fragment>
			);
		}
	}

	class CompleteForm extends SwitchForm {
		constructor(props) {
			super(props);

			this.state = {
				loading: true,
				message: null,
			};
		}

		componentDidMount() {
			this.submitData();
		}

		// eslint-disable-next-line class-methods-use-this
		prepareProfile(user, profile) {
			const name = `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim();
			const path = `${user.firstName || user.first_name || ''}-${user.lastName || user.last_name || ''}`
				.replace(/\s/g, '-')
				.toLowerCase();

			const dwellingSize = profile.private ? profile.private.dwellingSize :
				profile.public.dwellingSize;
			const { monthlyKWH } = calculateImpact(this.props.global.campaign, dwellingSize, 1, 12);

			Object.assign(profile, {
				name,
				path,
			}, profile);

			// eslint-disable-next-line no-param-reassign
			profile.private.monthlyKWH = monthlyKWH;

			if (this.isSelf()) {
				// If it's not available in their area, then don't mark them
				// as having started a switch
				if (marketAvailable(user.postcode)) {
					// eslint-disable-next-line no-param-reassign
					profile.public.switchStartedAt = new Date().toISOString();
				}

				ensureSet(profile, {
					private: { dwellingSize: 'hdb3' },
				});
			} else {
				// eslint-disable-next-line no-param-reassign
				profile.public.challengeStartedAt = new Date().toISOString();
				// eslint-disable-next-line no-param-reassign
				profile.public.switchOnHasGoal = 'yes';
				ensureSet(profile, {
					private: { friendDwellingSize: 'hdb3' },
					public: { switchOnGoal: 5 },
				});
			}

			if (this.isFriend()) {
				// eslint-disable-next-line no-param-reassign
				profile.public.switchOnShow = true;
			}

			return profile;
		}

		updateProfile = async (user, profile) => {
			const { integrations } = this.props;

			const profileData = {
				public: profile.public,
				private: profile.private,
			};

			const request = await this.props.api.profiles.update({
				id: this.props.global.user.profile.uuid,
				data: { data: profileData },
			});
			this.props.actions.addUserProfile(request.body().data().data);
			this.props.actions.addMessage('Profile updated succesfully');
			integrations.broadcast('profile.updated', { user: this.props.global.user, profile: request.body().data().data });

			if (user) {
				await this.props.api.users.update({
					id: this.props.global.user.uuid,
					data: { data: user },
				});
			}
		}

		registerProfile = async (user, profile) => {
			const { actions } = this.props;

			// Take parent hint
			const parentUuid = getQuery().groupUuid;
			if (parentUuid) {
				console.log('Group to join indicated: ', parentUuid);
				// eslint-disable-next-line no-param-reassign
				profile.parentUuid = parentUuid;
			}

			const res = await api.campaigns.register({
				id: this.props.global.campaign.uuid,
				data: { data: { user, profile } },
			});

			const { token, message } = res.body().data();
			console.log(message);

			// Log the user in
			if (token) {
				// log user in
				const newUser = await api.users.setTokenGetUser(token);

				// add user to global state
				actions.addUser(newUser.body().data().data);

				// get profiles
				const profiles = await api.users.meWithProfiles();

				// add profile to user
				actions.addUserProfile(findMostRelevantProfile(profiles
					.body().data().data, this.props.global.campaign.uuid));
			}

			return token;
		}

		submitData = async () => {
			const {
				updateStep, step, updateValues,
			} = this.props;

			const { profile, user } = this.props.values;

			this.prepareProfile(user, profile);

			const loggedIn = !!this.props.global.user;

			console.log('About to create/update', profile, user);

			try {
				let hasToken = loggedIn;

				if (loggedIn) {
					// Only update user if we need to set a postcode
					const updateUser = this.isSelf() && user.postcode;
					await this.updateProfile(updateUser ? user : null, profile);
				} else {
					hasToken = await this.registerProfile(user, profile);
				}

				updateValues({ loading: 'saving' });

				const { postcode } = this.props.values.user;

				if (this.isSelf() && !marketAvailable(postcode)) {
					updateValues({}, () => updateStep(this.props.steps.indexOf(OpenMarketNotAvailable)));
				} else if (hasToken || this.isSelf()) {
					const nextPath = this.isSelf() ? '/retailers' : '/dashboard';

					this.props.history.push(nextPath);
				} else {
					updateValues({ mustLogIn: true });
				}
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
						<p>One moment...</p>
						<Spinner />
					</div>
				);
			}

			if (this.state.mustLogIn) {
				return (
					<div className="signup-form__complete">
						<p>{'You\'ve'} already set up a profile with that email address.</p>
						<p>{'You\'ll'} need to login to see your progress.</p>
						<p>{'We\'ve'} sent you an email with a link to login.</p>
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
		state = {};

		componentDidMount() {
			this.loadPrivate();
		}

		async loadPrivate() {
			let privateProfile;

			if (['saving', 'complete', 'fetching'].includes(this.state.loading)) return;

			if (this.props.global.user) {
				this.setState({ loading: 'fetching' });
				const { profile } = this.props.global.user;
				try {
					const result = await api.profiles.get({
						id: profile.uuid,
						query: { private: 1 },
					});
					this.setState({ loading: 'complete' });
					privateProfile = result.body().data().data;
				} catch (error) {
					console.log(error);
					this.setState({ error });
					return;
				}
			} else if (this.state.loading === 'initial') {
				return;
			} else {
				this.setState({ loading: 'initial' });
			}

			this.initialise(privateProfile);
		}

		initialise(privateProfile) {
			const { props } = this;

			const initState = {
				user: {},
				profile: Object.assign({
					goal: 1,
					currency: props.global.campaign.currency,
					public: {
					},
					private: {
						dwellingSize: 'hdb3',
					},
				}, privateProfile),
				error: null,
				switchType: this.selectSwitchType(),
				loaded: true,
			};

			initState.profile.private.friendDwellingSize = initState.profile.private.friendDwellingSize ||
				initState.profile.private.dwellingSize;

			initState.steps = this.buildSteps(initState, props);

			console.log('initial state: ', initState);
			this.setState(initState);
		}

		updateValues = (
			handleState, // handles state object or state update function
			afterUpdateCallback // callback after updated
		) => {
			console.log('Update called', handleState);

			// handle state update function
			if (typeof handleState === 'function') {
				return this.setState(handleState, afterUpdateCallback);
			}

			const { state: oldState } = this;

			// setState only updates the state keys it's presented, so only batch
			// changes that are passed through handleState
			const toUpdate = {};

			['user', 'profile', 'teamProfile', 'donation', 'settings', 'error', 'loading'].forEach((updateKey) => {
				// only apply certain values to setState if they actually changes
				if (!handleState[updateKey]) return;

				// apply the updated values to the old one and append
				toUpdate[updateKey] = { ...oldState[updateKey], ...handleState[updateKey] };
			});

			if (handleState.switchType) toUpdate.switchType = handleState.switchType;

			return this.setState(toUpdate, afterUpdateCallback);
		}

		selectSwitchType() {
			const query = getQuery();

			const { user } = this.props.global;

			if (user && user.profile) {
				if (user.profile.confirmedAt) {
					console.log('Initial switch: locked to friend (profile confirmed already)');
					return 'friend';
				}
			}

			if (validSwitchTypes.includes(query.switch)) {
				console.log(`Initial switch set by query: ${query.switch}`);
				return query.switch;
			}

			console.log('Initial switch: default to self');

			return 'self';
		}

		// eslint-disable-next-line class-methods-use-this
		buildSteps(initState) {
			const query = getQuery();

			const steps = [];

			if (query.switch) {
				// eslint-disable-next-line no-param-reassign
				initState.switchType = query.switch;
			}

			steps.push(
				ImpactForm,
				UserForm,
				CompleteForm,
				OpenMarketNotAvailable
			);
			return steps;
		}

		render() {
			if (!this.state.loaded || this.state.loaded === 'fetching') {
				if (this.state.error) {
					return (
						<p>{this.state.error.message}</p>
					);
				}

				return (
					<p>Loading ...</p>
				);
			}

			this.loadPrivate();

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
