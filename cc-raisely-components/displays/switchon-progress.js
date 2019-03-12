/**
  * Custom Progress Bar
  * For displaying progress on things other than donations
  * eg ExerciseTotals
  *
  * Define the following fields for the custom component
  *
  * @field {text} size small, medium or large
  * @field {text} style standard, hollow, rounded
  * @field {text} statPosition top, middle or bottom
  * @field {text} showGoal 0 or 1
  * @field {text} showTotal 0 or 1
  * @field {text} totalText  '%n people switched',
  * @field {text} goalText 'Goal: %n',
  * @field {text} profile campaign,page,user
  */

// eslint-disable-next-line no-unused-expressions
(RaiselyComponents, React) => {
	const validSizes = ['small', 'medium', 'large'];
	const validStyles = ['standard', 'hollow', 'rounded'];
	const validProfiles = ['page', 'campaign', 'user'];

	const { api } = RaiselyComponents;

	const defaults = {
		size: 'medium',
		style: 'standard',
		showGoal: 1,
		showTotal: 1,
		statPosition: 'top',
		totalText: '%n people switched',
		goalText: 'Goal: %n',
	};

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
		total,
	}) {
		// When we're editing pages, make the progress non-zero so that
		// we can see what the progress bar looks like
		const defaultProgress = isPreview ? 3 : 0;

		// eslint-disable-next-line no-param-reassign
		if (!profile) profile = {};

		// Select the exercise totals to display
		const displayAmount = total || defaultProgress;
		const displayGoal = (profile.public && profile.public.switchOnGoal) || 10;

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
					<span className="progress-bar__bar" style={{ width: `${Math.floor(Math.round(percentage, 100))}%` }}>
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

	return class SwitchOnProgress extends React.Component {
		state = {
			switched: 0,
		}

		onComponentDidMount() {
			this.fetchPeopleSwitched();
		}

		displayType() {
			const values = this.props.getValues();
			const { profile } = values;

			return (validProfiles.includes(profile)) ? profile : 'campaign';
		}

		selectProfile() {
			const select = this.displayType();

			if (select === 'page') {
				const { profile } = this.props.global.current;

				return profile;
			}

			if (select === 'user') {
				const { profile } = this.props.global.user;

				return profile;
			}

			return this.props.global.campaign.profile;
		}

		async fetchPeopleSwitched() {
			const displayType = this.displayType();

			const hasFetched = this.state.switched;

			if (hasFetched) return;

			const profile = this.selectProfile();

			let result;

			// Group page = all descendents of the group (individual)
			// Individual page = all the children of the profile (individual)
			// Campaign = all individual profiles
			const query = {
				type: 'INDIVIDUAL',
				'public.switchOnConfirmed': 'yes',
			};

			if (displayType === 'campaign') {
				result = await api.profiles.getAll({
					query,
				});
			} else {
				result = await api.profiles.members.getAll({
					id: profile.uuid,
					query,
				});
			}

			const switched = result.body().data().pagination.total;

			// bind the payload result to this component
			this.setState({ switched });
		}

		render() {
			const { props } = this;
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
			} = values;

			// Are we actually on the public website or the editor
			const isMock = props.global.campaign.mock;

			const profile = this.selectProfile();
console.log("Profile", profile)
			return (
				<ProgressBar
					size={size}
					style={style}
					profile={profile}
					statPosition={statPosition}
					showTotal={showTotal}
					showGoal={showGoal}
					goalText={goalText}
					totalText={totalText}
					isPreview={isMock}
					total={this.state.switched}
				/>
			);
		}
	};
};
