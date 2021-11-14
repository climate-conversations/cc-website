(RaiselyComponents, React) => {
	const { api } = RaiselyComponents;
	const { getData } = api;
	const { useEffect, useState } = React;
	const { get, startCase, displayCurrency } = RaiselyComponents.Common;

	const validSizes = ['small', 'medium', 'large'];
	const validStyles = ['standard', 'hollow', 'rounded'];

	const progressBarClass = (variants) => {
		let output = 'progress-bar';
		variants.forEach((variant) => {
			output += ` progress-bar--${variant[0]}-${variant[1]}`;
		});
		return output;
	};

	async function resolveDonationAmounts(
		campaign,
		profileUuid,
		commitmentMonths,
		mock
	) {
		if (!campaign)
			return {
				donatedAmount: 0,
				matchedAmount: 0,
				committedAmount: 0,
				raisedAmount: 0,
			};

		if (mock) {
			const values = {
				donatedAmount: 8000,
				matchedAmount: 3000,
				committedAmount: 500 * (commitmentMonths - 1),
			};
			values.raisedAmount =
				values.donatedAmount +
				values.matchedAmount +
				values.committedAmount;
			return values;
			// profileUuid = "b6cbe770-995f-11e9-a069-0fb9e752d48b";
		}

		const [donations, subscriptions] = await Promise.all([
			getData(
				api.donations.getAll({
					query: {
						profile: profileUuid,
						campaign: campaign.uuid,
						limit: 100,
					},
				})
			),
			getData(
				api.subscriptions.getAll({
					query: {
						profile: profileUuid,
						campaign: campaign.uuid,
						status: 'OK',
						limit: 100,
					},
				})
			),
		]);

		// Amount donated
		let donatedAmount = 0;
		// Amount from the matching pool
		let matchedAmount = 0;
		// Recurring gifts committed and will be matched
		let committedAmount = 0;

		donations.forEach((donation) => {
			if (donation.processing === 'ONCE') {
				const isMatched =
					donation.createdAt < '2020-12-08' &&
					donation.createdAt > '2020-12-01';
				donatedAmount += donation.campaignAmount;
				if (isMatched && matchedAmount < 500000)
					matchedAmount = Math.min(
						500000,
						matchedAmount + donation.campaignAmount
					);
				console.log(
					'don',
					donation.preferredName,
					donation.amount,
					isMatched,
					donatedAmount,
					matchedAmount
				);
			}
		});
		subscriptions.forEach((subscription) => {
			const isMatched =
				subscription.createdAt < '2020-12-08' &&
				subscription.createdAt > '2020-12-01';

			const campaignAmount = subscription.amount;

			donatedAmount += campaignAmount;
			committedAmount += campaignAmount * (commitmentMonths - 1);
			// Don't count the donation just past
			if (isMatched && matchedAmount < 500000)
				matchedAmount += Math.min(
					500000,
					campaignAmount * commitmentMonths
				);
			console.log(
				'sub',
				subscription.mode,
				subscription.createdAt,
				subscription.user.preferredName,
				subscription.amount,
				commitmentMonths * campaignAmount,
				isMatched,
				matchedAmount,
				committedAmount
			);
		});

		matchedAmount = Math.min(matchedAmount, 500000);

		return {
			// Amount that's donated
			donatedAmount,
			// Matched pool used
			matchedAmount,
			// Committed from subscriptions
			committedAmount,
			raisedAmount: donatedAmount + committedAmount,
		};
	}

	async function generateAmount({
		campaign,
		profileUuid,
		commitmentMonths,
		isEditing,
		costPerUnit,
		alreadyRaised,
		goal,
	}) {
		const amounts = await resolveDonationAmounts(
			campaign,
			profileUuid,
			commitmentMonths,
			isEditing
		);

		console.log('Calculating amounts', {
			alreadyRaised,
			raisedAmount: amounts.raisedAmount,
			goal,
			costPerUnit,
		});

		return {
			raised:
				((parseInt(alreadyRaised) || 0) + amounts.raisedAmount / 100) /
				parseInt(costPerUnit),
			goal:
				((parseInt(alreadyRaised) || 0) + goal / 100) /
				parseInt(costPerUnit),
		};
	}

	/**
	 * Turn the decimal part into a fraction (down to quarters)
	 */
	const displayHumanAmount = (amount) => {
		const integerPart = Math.floor(amount);
		const fraction = amount - integerPart;

		let friendlyFraction = '';
		if (fraction >= 0.75) friendlyFraction = '¾';
		else if (fraction >= 0.5) friendlyFraction = '½';
		else if (fraction >= 0.25) friendlyFraction = '¼';
		return `${integerPart}${friendlyFraction}`;
	};

	return function CustomMeasureProgressBar({
		// profile or campaign
		global,
		getValues,
		isEditing,
	}) {
		const [totals, setTotals] = useState({});

		const { campaign } = global;
		const profileUuid = get(
			global,
			'current.profile.uuid',
			'b6cbe770-995f-11e9-a069-0fb9e752d48b'
		);
		const goal = get(global, 'current.profile.goal', 1);

		const values = getValues();

		const {
			commitmentMonths,
			statPosition,
			className,
			size,
			style,
			showGoal,
			showRaised,
			alreadyRaised,
			amountDescription,
			costPerUnit,
		} = values;

		const barSize = validSizes.includes(size) ? size : 'medium';
		const barStyle = validStyles.includes(style) ? style : 'standard';
		const showStats = showRaised || showGoal;

		async function load() {
			try {
				const amounts = await generateAmount({
					campaign,
					profileUuid,
					commitmentMonths,
					isEditing,
					costPerUnit,
					alreadyRaised,
					amountDescription,
					goal,
				});

				setTotals(amounts);
			} catch (e) {
				console.error(e);
			}
		}

		useEffect(() => {
			load();
		}, [
			profileUuid,
			commitmentMonths,
			costPerUnit,
			alreadyRaised,
			amountDescription,
			isEditing,
		]);

		// Calculate percentage totals, ensuring all
		const raisedPercent = Math.min(
			(totals.raised * 100) / totals.goal,
			100
		);

		console.log(`Calculated ${raisedPercent}%: `, totals);

		const renderAmount = (amount, name, label) =>
			values[`show${startCase(name)}`] && (
				<span
					className={`progress-bar__total-${name}`}
					data-total={`${totals.donatedAmount}`}
				>
					{amount &&
						`${displayHumanAmount(amount)} ${amountDescription}`}
				</span>
			);

		const progressTotalAndGoal = (
			<React.Fragment>
				{renderAmount(totals.raised, 'raised', amountDescription)}
				{renderAmount(totals.goal, 'goal', amountDescription)}
			</React.Fragment>
		);

		const innerBar = (amount, percentage, name) =>
			percentage > 0 ? (
				<span
					className={`progress-bar__bar progress-bar__${name} progress-bar__bar--animated`}
					style={{
						width: `${Math.floor(Math.round(percentage, 100))}%`,
					}}
				/>
			) : (
				undefined
			);

		return (
			<div
				className={`${className} ${progressBarClass([
					['size', barSize],
					['style', barStyle],
				])}`}
			>
				{statPosition === 'top' && showStats && (
					<div className="progress-bar__stats-outter progress-bar__stats-outter--above">
						{progressTotalAndGoal}
					</div>
				)}
				<div className="progress-bar__progress">
					{innerBar(totals.raised, raisedPercent, 'committed')}
				</div>
				{statPosition === 'bottom' && showStats && (
					<div className="progress-bar__stats-outter progress-bar__stats-outter--below">
						{progressTotalAndGoal}
					</div>
				)}
			</div>
		);
	};
};
