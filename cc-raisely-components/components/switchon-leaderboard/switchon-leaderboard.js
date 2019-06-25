/**
  * Custom Leader Board
  * For displaying leaders based on things other than donations
  * eg ExerciseTotals
  *
  * Define the following fields for the custom component
  *
  * @field {text} profileType individual, group
  * @field {text} profileFrom campaign,page
  * @field {text} list members,all
  * @field {text} rank 0 or 1
  * @field {text} header The header text
  * @field {text} headerTag h1,h2,h3,h4,h5,h6s
  * @field {text} size small, medium or large
  * @field {text} style standard, hollow, rounded
  * @field {text} statPosition top, middle or bottom
  * @field {text} showGoal 0 or 1
  * @field {text} showTotal 0 or 1
  * @field {text} totalText  '%n people switched',
  * @field {text} goalText 'Goal: %n',
  */


// eslint-disable-next-line no-unused-expressions
(RaiselyComponents, React) => {
	/**
	 * This is the closure area of your custom component, allowing you to
	 * specify and declare code used by your main component. This allows for
	 * a greater amount of complexity in your components while ensuring your
	 * component performs correctly.
	 */

	/**
	 * The api can be accessed from the RaiselyComponents object, along with various
	 * internal Raisely Components
	 */
	const { api, Atoms } = RaiselyComponents;
	const { Button } = Atoms;

	const validSizes = ['small', 'medium', 'large'];
	const validStyles = ['standard', 'hollow', 'rounded'];

	const defaults = {
		size: 'medium',
		style: 'standard',
		showGoal: 1,
		showTotal: 1,
		statPosition: 'top',
		totalText: '%n people switched',
		goalText: 'Goal: %n',
		headerTag: 'h3',
	};

	function ProgressBar({
		// profile or campaign
		profile,
		size,
		style,
		showTotal,
		showGoal,
		statPosition,
		totalText,
		goalText,
		isPreview,
		goal,
		value,
	}) {
		const progressBarClass = (variants) => {
			let output = 'progress-bar';
			variants.forEach((variant) => {
				output += ` progress-bar--${variant[0]}-${variant[1]}`;
			});
			return output;
		};

		function makeText(text, number) {
			return text.replace(/\%n/g, number);
		}

		// When we're editing pages, make the progress non-zero so that
		// we can see what the progress bar looks like
		const displayAmount = isPreview ? 3 : value;
		const displayGoal = isPreview ? 5 : goal;

		const barSize = validSizes.includes(size) ? size : 'medium';
		const barStyle = validStyles.includes(style) ? style : 'standard';
		const percentage = (displayAmount / displayGoal) * 100;

		const showStats = showGoal || showTotal;

		const progressTotal = showTotal && (
			<span className="progress-bar__total">{`${makeText(totalText, displayAmount)}`}</span>
		);
		const progressGoal = showGoal && (
			<span className="progress-bar__goal">{makeText(goalText, displayGoal)}</span>
		);

		const midStyle = { width: `${Math.floor(Math.round(percentage, 100))}%` };

		return (
			<div className={progressBarClass([['size', barSize], ['style', barStyle]])}>
				{(statPosition === 'top' && showStats) && (
					<div className="progress-bar__stats-outter progress-bar__stats-outter--above">
						{progressTotal}
						{progressGoal}
					</div>
				)}
				<div className="progress-bar__progress">
					{statPosition === 'middle' ? progressTotal + progressGoal : null}
					<span className="progress-bar__bar" style={midStyle}>
						{statPosition === 'middle' ? progressTotal + progressGoal : null}
					</span>
				</div>
				{(statPosition === 'bottom' && showStats) && (
					<div className="progress-bar__stats-outter progress-bar__stats-outter--below">
						{progressTotal}
						{progressGoal}
					</div>
				)}
			</div>
		);
	}

	const ProfileImage = (props, context) => {
		const fallbackImage = 'https://storage.googleapis.com/raisely-assets/default-profile.svg';

		const { profile } = props;

		const image = profile.photoUrl || fallbackImage;

		const style = { backgroundImage: `url(${image})` };

		return (
			<div className="profile-image">
				<div
					className="profile-image__photo"
					style={style}
				/>
			</div>
		);
	};

	const ProfileTile = (props, context) => {
		const {
			size,
			showTotal, // 0 or 1
			showGoal, // 0 or 1
			statPosition, // top, middle or bottom
			style,
			goalText,
			totalText,
			profile,
			mock,
			rank,
		} = props;

		const goal = profile && profile.public && profile.public.switchOnGoal;

		const headerText = (rank ? `${rank}. ` : '') + profile.name;

		const action = () => this.props.history.push(`/${profile.path}`);

		return (
			<li onclick={action}>
				<a href={`/${profile.path}`} >
					<ProfileImage
						profile={profile}
					/>
					<h1>{headerText}</h1>
					<ProgressBar
						size={size}
						statPosition={statPosition}
						showTotal={showTotal}
						showGoal={showGoal}
						goalText={goalText}
						totalText={totalText}
						isPreview={mock}
						goal={goal}
						value={profile.total}
					/>
				</a>
			</li>

		);
	};

	/**
	 * Once you've declared your required components, be sure to return the class
	 * representing your final Raisely Component so it can be shown on your page.
	 */
	return class Leaderboard extends React.Component {
		state = {
			profiles: null,
		}

		componentDidMount() {
			// when this component first loads, let's perform the call
			this.fetchModels();
		}

		fetchModels = async () => {
			// Don't duplicate fetches
			if (this.state.fetching) return;

			const values = this.props.getValues();
			const { profileType, profileFrom, list } = values;

			let profile;
			if (profileFrom === 'campaign') {
				({ profile } = this.props.global.campaign);
			} else {
				({ profile } = this.props.global.current);
			}

			if (!profile) return;

			this.setState({ fetching: true });

			let result;

			if (list === 'members') {
				result = await api.profiles.members.getAll({
					id: profile.uuid,
				});
			} else {
				const query = {
					type: (profileType && profileType.startsWith('group')) ?
						'GROUP' : 'INDIVIDUAL',
				};

				result = await api.profiles.getAll({
					query,
				});
			}

			const profiles = result.body().data().data;

			// bind the payload result to this component
			this.setState({ profiles });
		}

		render() {
			const values = this.props.getValues();

			Object.keys(values)
				.forEach((key) => { if (values[key] === null) values[key] = defaults[key]; });
			// eslint-disable-next-line eqeqeq
			values.showTotal = values.showTotal == '1';
			// eslint-disable-next-line eqeqeq
			values.showGoal = values.showGoal == '1';

			const {
				size,
				showTotal, // 0 or 1
				showGoal, // 0 or 1
				statPosition, // top, middle or bottom
				style,
				goalText,
				totalText,
				header,
				headerTag,
				rank,
			} = values;

			if (!this.state.profiles) {
				this.fetchModels();
				return (
					<p>Loading leader board ...</p>
				);
			}

			const HeaderTag = `${headerTag || 'h3'}`;
			// Are we actually on the public website or the editor
			const { mock } = this.props.global.campaign;

			// Show a mock item if we're in the editor and profiles returns nothing
			// or the elemnt will disappear
			if (mock && !this.state.profiles.length) {
				this.state.profiles = [
					{
						name: 'Team member',
					},
				];
			}

			const parentProfile = this.props.global.current.profile ||
				this.props.global.campaign.profile;

			const headerText = header && header.replace(/\{name\}/g, parentProfile.name);

			return (
				<div className="leaderboard">
					{header && this.state.profiles.length ? <HeaderTag>{headerText}</HeaderTag> : ''}
					<ol>
						{this.state.profiles.map((profile, index) => (
							<ProfileTile
								profile={profile}
								size={size}
								showTotal={showTotal}
								showGoal={showGoal}
								statPosition={statPosition}
								style={style}
								goalText={goalText}
								totalText={totalText}
								mock={mock}
								rank={(rank == '1') ? index + 1 : false}
							/>
						))}
					</ol>
				</div>
			);
		}
	};
};
